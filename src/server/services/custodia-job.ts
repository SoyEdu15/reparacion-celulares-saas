import { dbAdmin } from '@/lib/db';
import { encolarNotificacion } from '@/lib/queues/notificaciones-queue';

/**
 * Job cross-tenant (sección 4.3): revisa TODOS los tenants con app_admin
 * (BYPASSRLS) a propósito — recorre equipos listos para recoger sin
 * reclamar, para reenviar recordatorio según el intervalo configurado por
 * cada tenant, y para señalar abandono cuando se cumple el plazo. El
 * sistema solo marca — nunca ejecuta ninguna acción irreversible sobre el
 * equipo (sección 4.3: "el sistema solo señala el caso").
 *
 * Los recordatorios se identifican en mensajes_log por no tener
 * historial_estado_id (los de cambio de estado sí lo tienen) — así se
 * puede saber cuándo fue el último recordatorio sin una columna aparte.
 */
export async function procesarCustodiaDiaria(): Promise<{ recordatoriosEnviados: number; marcadosAbandonados: number }> {
  const ahora = new Date();
  let recordatoriosEnviados = 0;
  let marcadosAbandonados = 0;

  const listos = await dbAdmin.reparacion.findMany({
    where: { estado: 'LISTO_PARA_ENTREGA', marcadoAbandonado: false },
    include: { tenant: true, cliente: true },
  });

  for (const rep of listos) {
    const intervaloMs = rep.tenant.intervaloRecordatorioDias * 24 * 60 * 60 * 1000;
    const ultimoRecordatorio = await dbAdmin.mensajeLog.findFirst({
      where: { reparacionId: rep.id, historialEstadoId: null },
      orderBy: { createdAt: 'desc' },
    });
    const tocaRecordar =
      !ultimoRecordatorio || ahora.getTime() - ultimoRecordatorio.createdAt.getTime() >= intervaloMs;

    if (tocaRecordar) {
      if (rep.tenant.whatsappActivo && rep.cliente.telefono) {
        const m = await dbAdmin.mensajeLog.create({
          data: { tenantId: rep.tenantId, reparacionId: rep.id, canal: 'WHATSAPP', destinatario: rep.cliente.telefono },
        });
        await encolarNotificacion({ mensajeLogId: m.id, tenantId: rep.tenantId });
        recordatoriosEnviados++;
      }
      if (rep.tenant.emailActivo && rep.cliente.email) {
        const m = await dbAdmin.mensajeLog.create({
          data: { tenantId: rep.tenantId, reparacionId: rep.id, canal: 'EMAIL', destinatario: rep.cliente.email },
        });
        await encolarNotificacion({ mensajeLogId: m.id, tenantId: rep.tenantId });
        recordatoriosEnviados++;
      }
    }

    const limiteAbandonoMs = rep.tenant.diasLimiteAbandono * 24 * 60 * 60 * 1000;
    if (ahora.getTime() - rep.fechaRecibido.getTime() >= limiteAbandonoMs) {
      await dbAdmin.reparacion.update({
        where: { id: rep.id },
        data: { marcadoAbandonado: true, marcadoAbandonadoEn: ahora },
      });
      marcadosAbandonados++;
    }
  }

  return { recordatoriosEnviados, marcadosAbandonados };
}
