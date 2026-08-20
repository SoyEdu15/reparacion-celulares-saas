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
import { descargarLogo, descargarFoto } from '../src/lib/storage/r2';
import { EmailProvider } from '../src/lib/notifications/email-provider';
import { WhatsAppProviderStub } from '../src/lib/notifications/whatsapp-provider';
import type { EnvioNotificacion } from '../src/lib/notifications/notification-provider';
import { mensajeCambioEstado, mensajeRecordatorioCustodia } from '../src/lib/notifications/plantillas';
import { facturaEmailHtml, facturaEmailTexto, type FacturaEmailParams } from '../src/lib/notifications/factura-email';
import { cambioEstadoEmailHtml, recordatorioCustodiaEmailHtml } from '../src/lib/notifications/estado-email';
import { reciboEmailHtml, reciboEmailTexto } from '../src/lib/notifications/recibo-email';
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
            fotos: true,
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

    // Todo correo (no WhatsApp) lleva la plantilla con el logo, los datos
    // del taller y las fotos del equipo que correspondan a este momento —
    // nunca sale un email "pelado" solo con texto plano. Sirve como
    // soporte real para el cliente: el ingreso tiene su propio comprobante,
    // la factura de entrega su desglose de costos, y el resto de cambios
    // de estado una plantilla más simple — las tres comparten envoltorio.
    if (mensaje.canal === 'EMAIL') {
      const { tenant, fotos } = mensaje.reparacion;
      const esIngreso = mensaje.historialEstado?.estadoAnterior == null;
      const fotosRelevantes = esIngreso
        ? fotos.filter((f) => f.esFotoIngreso)
        : mensaje.historialEstado
          ? fotos.filter((f) => f.historialEstadoId === mensaje.historialEstado!.id)
          : [];

      const [logo, ...fotosDescargadas] = await Promise.all([
        tenant.logoUrl ? descargarLogo(tenant.logoUrl) : Promise.resolve(null),
        ...fotosRelevantes.map((f) => descargarFoto(f.storageKey)),
      ]);

      const attachmentsFotos = fotosDescargadas
        .map((foto, i) => (foto ? { filename: `foto-${i + 1}`, content: foto.buffer, cid: `foto${i}`, contentType: foto.contentType } : null))
        .filter((a): a is NonNullable<typeof a> => a !== null);
      const fotosCids = attachmentsFotos.map((a) => a.cid);
      const attachments = [
        ...(logo ? [{ filename: 'logo', content: logo.buffer, cid: 'logo', contentType: logo.contentType }] : []),
        ...attachmentsFotos,
      ];

      const tenantBranding = {
        nombreComercial: tenant.nombreComercial,
        nit: tenant.nit,
        direccion: tenant.direccion,
        telefono: tenant.telefono,
        piePaginaFactura: tenant.piePaginaFactura,
      };
      const datosOrden = {
        tenant: tenantBranding,
        tieneLogo: Boolean(logo),
        clienteNombre: mensaje.reparacion.cliente.nombre,
        numeroOrden: mensaje.reparacion.numeroOrden,
        equipoMarca: mensaje.reparacion.equipo.marca,
        equipoModelo: mensaje.reparacion.equipo.modelo,
      };

      const factura = mensaje.reparacion.facturas[0];
      if (esIngreso) {
        const params = {
          ...datosOrden,
          equipoImei: mensaje.reparacion.equipo.imei,
          danosReportados: mensaje.reparacion.danosReportados,
          estadoFisico: mensaje.reparacion.estadoFisico,
          presupuestoEstimado: mensaje.reparacion.presupuestoEstimado,
          anticipo: mensaje.reparacion.anticipo,
          diasCustodiaGratis: mensaje.reparacion.diasCustodiaGratisAplicado,
          fotosCids,
        };
        envio = {
          destinatario: mensaje.destinatario,
          asunto: `Comprobante de ingreso — Orden #${mensaje.reparacion.numeroOrden}`,
          mensaje: reciboEmailTexto(params),
          html: reciboEmailHtml(params),
          replyTo: tenant.remitenteEmailFacturas ?? undefined,
          attachments,
        };
      } else if (mensaje.historialEstado?.estadoNuevo === 'ENTREGADO' && factura) {
        const params: FacturaEmailParams = {
          ...datosOrden,
          fechaEntregaReal: mensaje.reparacion.fechaEntregaReal,
          diagnosticoTexto: mensaje.reparacion.diagnosticoTexto,
          fotosCids,
          factura: {
            numeroFactura: factura.numeroFactura,
            subtotalReparacion: factura.subtotalReparacion,
            cargoBodegaje: factura.cargoBodegaje,
            diasBodegajeCobrados: factura.diasBodegajeCobrados,
            anticipo: factura.anticipo,
            total: factura.total,
          },
        };
        envio = {
          destinatario: mensaje.destinatario,
          asunto: `Tu factura — Orden #${mensaje.reparacion.numeroOrden}`,
          mensaje: facturaEmailTexto(params),
          html: facturaEmailHtml(params),
          replyTo: tenant.remitenteEmailFacturas ?? undefined,
          attachments,
        };
      } else if (mensaje.historialEstado) {
        envio = {
          destinatario: mensaje.destinatario,
          asunto: `Actualización de tu reparación — Orden #${mensaje.reparacion.numeroOrden}`,
          mensaje: texto,
          html: cambioEstadoEmailHtml({
            ...datosOrden,
            estadoNuevo: mensaje.historialEstado.estadoNuevo,
            notaCorta: mensaje.historialEstado.notaCorta,
            diagnosticoTexto: mensaje.reparacion.diagnosticoTexto,
            mostrarDiagnostico: mensaje.historialEstado.estadoAnterior === 'DIAGNOSTICO',
            fotosCids,
          }),
          replyTo: tenant.remitenteEmailFacturas ?? undefined,
          attachments,
        };
      } else {
        envio = {
          destinatario: mensaje.destinatario,
          asunto: `Tu equipo sigue listo para recoger — Orden #${mensaje.reparacion.numeroOrden}`,
          mensaje: texto,
          html: recordatorioCustodiaEmailHtml(datosOrden),
          replyTo: tenant.remitenteEmailFacturas ?? undefined,
          attachments,
        };
      }
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
