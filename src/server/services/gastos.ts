import type { CategoriaGasto, TipoCostoReparacion } from '@prisma/client';
import { withTenant } from '@/lib/rls';
import { descontarStock, devolverStock } from './inventario';

export function registrarGasto(
  tenantId: string,
  usuarioId: string,
  data: { categoria: CategoriaGasto; descripcion: string; monto: number; fecha: Date },
) {
  return withTenant(tenantId, (tx) =>
    tx.gasto.create({ data: { tenantId, ...data, registradoPorId: usuarioId } }),
  );
}

export function eliminarGasto(tenantId: string, id: string) {
  return withTenant(tenantId, (tx) => tx.gasto.delete({ where: { id } }));
}

export function listarGastos(tenantId: string, desde: Date, hasta: Date) {
  return withTenant(tenantId, (tx) =>
    tx.gasto.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      orderBy: { fecha: 'desc' },
      include: { registradoPor: { select: { nombre: true } } },
    }),
  );
}

// ---------------------------------------------------------------------------
// Costos de una reparación puntual
// ---------------------------------------------------------------------------

export function listarCostosReparacion(tenantId: string, reparacionId: string) {
  return withTenant(tenantId, (tx) =>
    tx.costoReparacion.findMany({
      where: { reparacionId },
      orderBy: { fecha: 'asc' },
      include: { registradoPor: { select: { nombre: true } } },
    }),
  );
}

/**
 * Si el repuesto sale del inventario, se descuenta el stock y el costo se
 * toma del costo promedio del producto. Si se compró aparte para este equipo
 * (lo más común con pantallas), se registra el monto pagado.
 */
export async function agregarCostoReparacion(
  tenantId: string,
  usuarioId: string,
  data: {
    reparacionId: string;
    tipo: TipoCostoReparacion;
    productoId: string | null;
    descripcion?: string;
    cantidad: number;
    monto?: number;
  },
) {
  return withTenant(tenantId, async (tx) => {
    await tx.reparacion.findUniqueOrThrow({ where: { id: data.reparacionId }, select: { id: true } });

    let descripcion = data.descripcion ?? '';
    let monto = data.monto ?? 0;
    let cantidad = data.cantidad;
    if (data.productoId) {
      const producto = await descontarStock(tx, data.productoId, data.cantidad);
      descripcion = descripcion || `${producto.nombre} (inventario)`;
      monto = producto.costoPromedio * data.cantidad;
    } else {
      cantidad = 1;
    }

    return tx.costoReparacion.create({
      data: {
        tenantId,
        reparacionId: data.reparacionId,
        tipo: data.tipo,
        productoId: data.productoId,
        descripcion,
        cantidad,
        monto,
        registradoPorId: usuarioId,
      },
    });
  });
}

export async function eliminarCostoReparacion(tenantId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const costo = await tx.costoReparacion.findUniqueOrThrow({ where: { id } });
    if (costo.productoId) await devolverStock(tx, costo.productoId, costo.cantidad);
    await tx.costoReparacion.delete({ where: { id } });
    return costo;
  });
}
