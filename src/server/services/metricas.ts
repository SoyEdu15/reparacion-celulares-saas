import { withTenant } from '@/lib/rls';
import { ESTADOS_ORDEN } from '@/lib/estados-reparacion';

export type Metricas = {
  porEstado: { estado: string; cantidad: number }[];
  tiempoPromedioDias: number | null;
  ingresosMes: number;
  facturasMesCount: number;
  totalClientes: number;
  totalReparaciones: number;
  abandonadas: number;
};

/** Dashboard del dueño (sección 9, Fase 4): ingresos y tiempo promedio de reparación. */
export async function obtenerMetricas(tenantId: string): Promise<Metricas> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  return withTenant(tenantId, async (tx) => {
    const [grupoPorEstado, entregadas, facturasMes, totalClientes, totalReparaciones, abandonadas] =
      await Promise.all([
        tx.reparacion.groupBy({ by: ['estado'], _count: { _all: true } }),
        tx.reparacion.findMany({
          where: { estado: 'ENTREGADO', fechaEntregaReal: { not: null } },
          select: { fechaRecibido: true, fechaEntregaReal: true },
        }),
        tx.factura.aggregate({
          _sum: { total: true },
          _count: { _all: true },
          where: { createdAt: { gte: inicioMes } },
        }),
        tx.cliente.count(),
        tx.reparacion.count(),
        tx.reparacion.count({ where: { marcadoAbandonado: true } }),
      ]);

    const tiempoPromedioDias =
      entregadas.length > 0
        ? entregadas.reduce((acc, r) => acc + (r.fechaEntregaReal!.getTime() - r.fechaRecibido.getTime()), 0) /
          entregadas.length /
          (1000 * 60 * 60 * 24)
        : null;

    const conteoPorEstado = new Map(grupoPorEstado.map((g) => [g.estado, g._count._all]));
    const porEstado = ESTADOS_ORDEN.map((estado) => ({ estado, cantidad: conteoPorEstado.get(estado) ?? 0 }));

    return {
      porEstado,
      tiempoPromedioDias,
      ingresosMes: facturasMes._sum.total ?? 0,
      facturasMesCount: facturasMes._count._all,
      totalClientes,
      totalReparaciones,
      abandonadas,
    };
  });
}
