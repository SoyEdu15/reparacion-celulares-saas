import { withTenant } from '@/lib/rls';
import { encolarNotificacion } from '@/lib/queues/notificaciones-queue';

/**
 * Encola una notificación por cada canal activo del tenant (sección 4.2:
 * "en cada cambio de estado... vía cola asíncrona, no bloqueante, con
 * reintento si falla"). Se apoya en el último historial_estados de la
 * reparación para saber qué pasó — así no hay que pasar el estado nuevo
 * por todos los call sites. El insert en mensajes_log queda en la misma
 * transacción; el encolado en BullMQ pasa después, fuera de la
 * transacción (Redis no es transaccional con Postgres).
 */
export async function notificarCambioEstado(tenantId: string, reparacionId: string): Promise<void> {
  const idsCreados = await withTenant(tenantId, async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { whatsappActivo: true, emailActivo: true },
    });
    if (!tenant.whatsappActivo && !tenant.emailActivo) return [];

    const [reparacion, ultimoHistorial] = await Promise.all([
      tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId }, include: { cliente: true } }),
      tx.historialEstado.findFirst({ where: { reparacionId }, orderBy: { createdAt: 'desc' } }),
    ]);
    if (!ultimoHistorial) return [];

    const ids: string[] = [];
    if (tenant.whatsappActivo && reparacion.cliente.telefono) {
      const m = await tx.mensajeLog.create({
        data: {
          tenantId,
          reparacionId,
          historialEstadoId: ultimoHistorial.id,
          canal: 'WHATSAPP',
          destinatario: reparacion.cliente.telefono,
        },
      });
      ids.push(m.id);
    }
    if (tenant.emailActivo && reparacion.cliente.email) {
      const m = await tx.mensajeLog.create({
        data: {
          tenantId,
          reparacionId,
          historialEstadoId: ultimoHistorial.id,
          canal: 'EMAIL',
          destinatario: reparacion.cliente.email,
        },
      });
      ids.push(m.id);
    }
    return ids;
  });

  await Promise.all(idsCreados.map((id) => encolarNotificacion({ mensajeLogId: id, tenantId })));
}
