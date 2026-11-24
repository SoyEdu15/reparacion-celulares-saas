import type { CategoriaProducto, Prisma } from '@prisma/client';
import { withTenant } from '@/lib/rls';

type Tx = Prisma.TransactionClient;

export class ErrorInventario extends Error {}

/**
 * Bloquea la fila del producto hasta el final de la transacción: dos ventas
 * o entradas simultáneas del mismo producto se serializan, así el stock y el
 * costo promedio nunca se calculan sobre un valor viejo.
 */
export async function bloquearProducto(tx: Tx, productoId: string) {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM productos WHERE id = ${productoId} FOR UPDATE`;
  if (filas.length === 0) throw new ErrorInventario('Producto no encontrado');
  return tx.producto.findUniqueOrThrow({ where: { id: productoId } });
}

/** Costo promedio ponderado tras sumar `cantidad` unidades a `costoUnitario`. */
export function nuevoCostoPromedio(stockActual: number, costoActual: number, cantidad: number, costoUnitario: number) {
  const base = Math.max(stockActual, 0);
  if (base + cantidad <= 0) return costoUnitario;
  return Math.round((base * costoActual + cantidad * costoUnitario) / (base + cantidad));
}

/**
 * Descuenta stock (venta o repuesto usado en una reparación). Falla si no
 * alcanza: vender lo que no hay deja el inventario en negativo y el costo de
 * la venta sin respaldo.
 */
export async function descontarStock(tx: Tx, productoId: string, cantidad: number) {
  const producto = await bloquearProducto(tx, productoId);
  if (!producto.activo) throw new ErrorInventario(`"${producto.nombre}" está desactivado`);
  if (producto.stock < cantidad) {
    throw new ErrorInventario(`No hay suficiente stock de "${producto.nombre}" (quedan ${producto.stock})`);
  }
  await tx.producto.update({ where: { id: productoId }, data: { stock: { decrement: cantidad } } });
  return producto;
}

export async function devolverStock(tx: Tx, productoId: string, cantidad: number) {
  await bloquearProducto(tx, productoId);
  await tx.producto.update({ where: { id: productoId }, data: { stock: { increment: cantidad } } });
}

export function listarProductos(
  tenantId: string,
  filtros: { q?: string; categoria?: CategoriaProducto; incluirInactivos?: boolean } = {},
) {
  return withTenant(tenantId, (tx) =>
    tx.producto.findMany({
      where: {
        ...(filtros.incluirInactivos ? {} : { activo: true }),
        ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
        ...(filtros.q
          ? {
              OR: [
                { nombre: { contains: filtros.q, mode: 'insensitive' } },
                { codigo: { contains: filtros.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ activo: 'desc' }, { categoria: 'asc' }, { nombre: 'asc' }],
    }),
  );
}

export function obtenerProducto(tenantId: string, id: string) {
  return withTenant(tenantId, (tx) =>
    tx.producto.findUnique({
      where: { id },
      include: {
        entradas: {
          orderBy: { fecha: 'desc' },
          take: 30,
          include: { registradoPor: { select: { nombre: true } } },
        },
      },
    }),
  );
}

export async function crearProducto(
  tenantId: string,
  usuarioId: string,
  data: {
    nombre: string;
    categoria: CategoriaProducto;
    codigo?: string;
    precioVenta: number;
    stockMinimo: number;
    stockInicial: number;
    costoUnitario: number;
  },
) {
  return withTenant(tenantId, async (tx) => {
    const producto = await tx.producto.create({
      data: {
        tenantId,
        nombre: data.nombre,
        categoria: data.categoria,
        codigo: data.codigo ?? null,
        precioVenta: data.precioVenta,
        stockMinimo: data.stockMinimo,
        costoPromedio: data.costoUnitario,
        stock: data.stockInicial,
      },
    });
    // El stock inicial queda registrado como una entrada más, para que el
    // historial de compras del producto cuadre con su stock.
    if (data.stockInicial > 0) {
      await tx.entradaInventario.create({
        data: {
          tenantId,
          productoId: producto.id,
          cantidad: data.stockInicial,
          costoUnitario: data.costoUnitario,
          nota: 'Stock inicial',
          registradoPorId: usuarioId,
        },
      });
    }
    return producto;
  });
}

export function editarProducto(
  tenantId: string,
  data: {
    id: string;
    nombre: string;
    categoria: CategoriaProducto;
    codigo?: string;
    precioVenta: number;
    stockMinimo: number;
    costoPromedio: number;
  },
) {
  return withTenant(tenantId, (tx) =>
    tx.producto.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        categoria: data.categoria,
        codigo: data.codigo ?? null,
        precioVenta: data.precioVenta,
        stockMinimo: data.stockMinimo,
        costoPromedio: data.costoPromedio,
      },
    }),
  );
}

export function toggleActivoProducto(tenantId: string, id: string, activo: boolean) {
  return withTenant(tenantId, (tx) => tx.producto.update({ where: { id }, data: { activo } }));
}

export async function registrarEntrada(
  tenantId: string,
  usuarioId: string,
  data: { productoId: string; cantidad: number; costoUnitario: number; proveedor?: string; nota?: string; fecha: Date },
) {
  return withTenant(tenantId, async (tx) => {
    const producto = await bloquearProducto(tx, data.productoId);
    await tx.producto.update({
      where: { id: producto.id },
      data: {
        stock: { increment: data.cantidad },
        costoPromedio: nuevoCostoPromedio(producto.stock, producto.costoPromedio, data.cantidad, data.costoUnitario),
      },
    });
    return tx.entradaInventario.create({
      data: {
        tenantId,
        productoId: producto.id,
        cantidad: data.cantidad,
        costoUnitario: data.costoUnitario,
        proveedor: data.proveedor ?? null,
        nota: data.nota ?? null,
        registradoPorId: usuarioId,
        fecha: data.fecha,
      },
    });
  });
}

/**
 * Ajuste por conteo físico. Si faltan unidades (se dañaron, se perdieron),
 * su costo se registra como gasto: esa plata ya salió del negocio y las
 * cuentas tienen que mostrarlo.
 */
export async function ajustarStock(
  tenantId: string,
  usuarioId: string,
  data: { productoId: string; stockReal: number; nota?: string },
) {
  return withTenant(tenantId, async (tx) => {
    const producto = await bloquearProducto(tx, data.productoId);
    const diferencia = data.stockReal - producto.stock;
    if (diferencia === 0) return producto;

    await tx.producto.update({ where: { id: producto.id }, data: { stock: data.stockReal } });

    if (diferencia < 0) {
      const faltantes = -diferencia;
      const monto = faltantes * producto.costoPromedio;
      if (monto > 0) {
        await tx.gasto.create({
          data: {
            tenantId,
            categoria: 'OTRO',
            descripcion: `Ajuste de inventario: ${producto.nombre} (−${faltantes} und)${data.nota ? ` — ${data.nota}` : ''}`,
            monto,
            registradoPorId: usuarioId,
          },
        });
      }
    }
    return producto;
  });
}

export async function resumenInventario(tenantId: string) {
  const productos = await withTenant(tenantId, (tx) =>
    tx.producto.findMany({
      where: { activo: true },
      select: { categoria: true, stock: true, costoPromedio: true, precioVenta: true, stockMinimo: true },
    }),
  );
  let valorCosto = 0;
  let valorVenta = 0;
  let unidades = 0;
  let bajoStock = 0;
  for (const p of productos) {
    const s = Math.max(p.stock, 0);
    valorCosto += s * p.costoPromedio;
    valorVenta += s * p.precioVenta;
    unidades += s;
    if (p.stock <= p.stockMinimo) bajoStock += 1;
  }
  return { referencias: productos.length, unidades, valorCosto, valorVenta, bajoStock };
}
