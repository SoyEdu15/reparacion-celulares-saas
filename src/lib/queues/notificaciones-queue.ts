import { Queue } from 'bullmq';
import { getQueueConnection } from './connection';

export type NotificacionJobData = {
  mensajeLogId: string;
  tenantId: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __notificacionesQueue: Queue<NotificacionJobData> | undefined;
}

function getQueue(): Queue<NotificacionJobData> {
  if (!globalThis.__notificacionesQueue) {
    globalThis.__notificacionesQueue = new Queue<NotificacionJobData>('notificaciones', {
      connection: getQueueConnection(),
    });
  }
  return globalThis.__notificacionesQueue;
}

/** No bloqueante, con reintento si falla (sección 4.2 / 8) — 3 intentos con backoff exponencial. */
export async function encolarNotificacion(data: NotificacionJobData): Promise<void> {
  await getQueue().add('enviar', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
