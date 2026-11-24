import type { MetodoPago, TipoVenta } from '@prisma/client';
import { withTenant } from '@/lib/rls';
import { descontarStock, devolverStock, ErrorInventario } from './inventario';

export type ItemVentaInput = {
  productoId: string | null;
  tipo: TipoVenta;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
};

export async function registrarVenta(
  tenantId: string,
  usuarioId: string,
  data: { metodoPago: MetodoPago; cliente?: string; nota?: string; fecha: Date; items: ItemVentaInput[] },
) {
  return withTenant(tenantId, async (tx) => {
    const items: (ItemVentaInput & { tenantId: string })[] = [];

    for (const item of data.items) {
      if (item.productoId) {
        // Para productos del inventario el costo y la categoría salen del
        // propio producto, nunca del formulario: el técnico que registra la
        // venta no ve ni decide el costo.
        const producto = await descontarStock(tx, item.productoId, item.cantidad);
        items.push({
          tenantId,
          productoId: producto.id,
          tipo: producto.categoria,
          descripcion: item.descripcion || producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          costoUnitario: producto.costoPromedio,
        });
      } else {
        if (item.descripcion.length < 2) throw new ErrorInventario('Describe los ítems que no son del inventario');
        items.push({ ...item, tenantId, productoId: null });
      }
    }

    const total = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
    const costoTotal = items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);

    return tx.venta.create({
      data: {
        tenantId,
        metodoPago: data.metodoPago,
        cliente: data.cliente ?? null,
        nota: data.nota ?? null,
        total,
        costoTotal,
        fecha: data.fecha,
        registradoPorId: usuarioId,
        items: { create: items.map(({ tenantId: t, ...i }) => ({ ...i, tenantId: t })) },
      },
    });
  });
}

/** Anular en vez de borrar: queda la huella, y el stock vuelve al inventario. */
export async function anularVenta(tenantId: string, ventaId: string) {
  return withTenant(tenantId, async (tx) => {
    const venta = await tx.venta.findUniqueOrThrow({ where: { id: ventaId }, include: { items: true } });
    if (venta.anulada) return venta;
    for (const item of venta.items) {
      if (item.productoId) await devolverStock(tx, item.productoId, item.cantidad);
    }
    return tx.venta.update({ where: { id: ventaId }, data: { anulada: true, anuladaEn: new Date() } });
  });
}

export function listarVentas(tenantId: string, desde: Date, hasta: Date) {
  return withTenant(tenantId, (tx) =>
    tx.venta.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      orderBy: { fecha: 'desc' },
      include: { items: true, registradoPor: { select: { nombre: true } } },
    }),
  );
}
