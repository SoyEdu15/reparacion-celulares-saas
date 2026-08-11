/**
 * Proceso de worker de BullMQ — separado del servidor de Next.js a
 * propósito. Un Worker de BullMQ es un proceso de larga duración
 * escuchando la cola; si viviera dentro del servidor de Next.js, el HMR
 * del modo dev crearía un worker nuevo en cada recarga sin matar el
 * anterior, duplicando el procesamiento de jobs. En producción esto se
 * despliega como su propio proceso/servicio, igual que un worker de
 * Sidekiq o Celery se despliega aparte del servidor web.
 *
 * Correr en desarrollo: npm run worker (en una terminal aparte de `npm run dev`).
 */
import { Worker } from 'bullmq';
import { getQueueConnection } from '../src/lib/queues/connection';
import type { NotificacionJobData } from '../src/lib/queues/notificaciones-queue';
import { programarJobCustodiaDiario } from '../src/lib/queues/custodia-queue';
import { dbAdmin } from '../src/lib/db';
import { EmailProvider } from '../src/lib/notifications/email-provider';
import { WhatsAppProviderStub } from '../src/lib/notifications/whatsapp-provider';
import { mensajeCambioEstado, mensajeRecordatorioCustodia } from '../src/lib/notifications/plantillas';
import { procesarCustodiaDiaria } from '../src/server/services/custodia-job';

const emailProvider = new EmailProvider();
const whatsappProvider = new WhatsAppProviderStub();

const notificacionesWorker = new Worker<NotificacionJobData>(
  'notificaciones',
  async (job) => {
    const { mensajeLogId } = job.data;
    const mensaje = await dbAdmin.mensajeLog.findUniqueOrThrow({
      where: { id: mensajeLogId },
      include: {
        reparacion: { include: { cliente: true, equipo: true } },
        historialEstado: true,
      },
    });

    if (mensaje.estado === 'ENVIADO') return;

    const datosPlantilla = {
      clienteNombre: mensaje.reparacion.cliente.nombre,
      numeroOrden: mensaje.reparacion.numeroOrden,
      equipoMarca: mensaje.reparacion.equipo.marca,
      equipoModelo: mensaje.reparacion.equipo.modelo,
    };
    const texto = mensaje.historialEstado
      ? mensajeCambioEstado({ ...datosPlantilla, estadoNuevo: mensaje.historialEstado.estadoNuevo, notaCorta: mensaje.historialEstado.notaCorta })
      : mensajeRecordatorioCustodia(datosPlantilla);

    const provider = mensaje.canal === 'EMAIL' ? emailProvider : whatsappProvider;

    try {
      await provider.enviar({ destinatario: mensaje.destinatario, mensaje: texto });
      await dbAdmin.mensajeLog.update({
        where: { id: mensajeLogId },
        data: { estado: 'ENVIADO', enviadoEn: new Date() },
      });
    } catch (e) {
      await dbAdmin.mensajeLog.update({
        where: { id: mensajeLogId },
        data: { estado: 'FALLIDO', intentos: { increment: 1 }, errorMensaje: e instanceof Error ? e.message : String(e) },
      });
      throw e;
    }
  },
  { connection: getQueueConnection() },
);

notificacionesWorker.on('completed', (job) => console.log(`[worker] notificación ${job.id} enviada`));
notificacionesWorker.on('failed', (job, err) => console.error(`[worker] notificación ${job?.id} falló: ${err.message}`));

const custodiaWorker = new Worker(
  'custodia',
  async () => {
    const resultado = await procesarCustodiaDiaria();
    console.log(`[worker] custodia diaria: ${resultado.recordatoriosEnviados} recordatorio(s), ${resultado.marcadosAbandonados} marcado(s) como abandonado`);
    return resultado;
  },
  { connection: getQueueConnection() },
);

custodiaWorker.on('failed', (job, err) => console.error(`[worker] job de custodia falló: ${err.message}`));

void (async () => {
  await programarJobCustodiaDiario();
  console.log('Worker escuchando "notificaciones" y "custodia" (custodia corre todos los días 8:00am)...');
})();
