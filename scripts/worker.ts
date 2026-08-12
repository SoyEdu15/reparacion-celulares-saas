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
import { descargarLogo } from '../src/lib/storage/r2';
import { EmailProvider } from '../src/lib/notifications/email-provider';
import { WhatsAppProviderStub } from '../src/lib/notifications/whatsapp-provider';
import type { EnvioNotificacion } from '../src/lib/notifications/notification-provider';
import { mensajeCambioEstado, mensajeRecordatorioCustodia } from '../src/lib/notifications/plantillas';
import { facturaEmailHtml, facturaEmailTexto, type FacturaEmailParams } from '../src/lib/notifications/factura-email';
import { procesarCustodiaDiaria } from '../src/server/services/custodia-job';

const emailProvider = new EmailProvider();
const whatsappProvider = new WhatsAppProviderStub();

const notificacionesWorker = new Worker<NotificacionJobData>(
  'notificaciones',
  async (job) => {
    const { mensajeLogId } = job.data;
    const mensaje = await dbAdmin.mensajeLog.findUnique({
      where: { id: mensajeLogId },
      include: {
        reparacion: {
          include: {
            cliente: true,
            equipo: true,
            tenant: true,
            facturas: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        historialEstado: true,
      },
    });

    // El registro pudo haber sido borrado (ej. limpieza de datos de prueba)
    // entre encolar y procesar — no hay nada que reintentar en ese caso.
    if (!mensaje) {
      console.warn(`[worker] mensaje_log ${mensajeLogId} ya no existe, se omite`);
      return;
    }
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

    let envio: EnvioNotificacion = { destinatario: mensaje.destinatario, mensaje: texto };

    // Al entregar, el correo lleva la factura real (logo + desglose de
    // costos) en vez del texto genérico de cambio de estado — eso es
    // exclusivo del canal EMAIL, WhatsApp se queda con `texto`.
    const factura = mensaje.reparacion.facturas[0];
    if (mensaje.canal === 'EMAIL' && mensaje.historialEstado?.estadoNuevo === 'ENTREGADO' && factura) {
      const { tenant } = mensaje.reparacion;
      const logo = tenant.logoUrl ? await descargarLogo(tenant.logoUrl) : null;

      const params: FacturaEmailParams = {
        tenant: {
          nombreComercial: tenant.nombreComercial,
          nit: tenant.nit,
          direccion: tenant.direccion,
          telefono: tenant.telefono,
          piePaginaFactura: tenant.piePaginaFactura,
        },
        tieneLogo: Boolean(logo),
        clienteNombre: mensaje.reparacion.cliente.nombre,
        numeroOrden: mensaje.reparacion.numeroOrden,
        equipoMarca: mensaje.reparacion.equipo.marca,
        equipoModelo: mensaje.reparacion.equipo.modelo,
        fechaEntregaReal: mensaje.reparacion.fechaEntregaReal,
        factura: {
          numeroFactura: factura.numeroFactura,
          subtotalReparacion: factura.subtotalReparacion,
          cargoBodegaje: factura.cargoBodegaje,
          diasBodegajeCobrados: factura.diasBodegajeCobrados,
          total: factura.total,
        },
      };

      envio = {
        destinatario: mensaje.destinatario,
        asunto: `Tu factura — Orden #${mensaje.reparacion.numeroOrden}`,
        mensaje: facturaEmailTexto(params),
        html: facturaEmailHtml(params),
        replyTo: tenant.remitenteEmailFacturas ?? undefined,
        attachments: logo ? [{ filename: 'logo', content: logo.buffer, cid: 'logo', contentType: logo.contentType }] : undefined,
      };
    }

    const provider = mensaje.canal === 'EMAIL' ? emailProvider : whatsappProvider;

    try {
      await provider.enviar(envio);
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
