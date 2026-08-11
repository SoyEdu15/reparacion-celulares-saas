import type { NotificationProvider, EnvioNotificacion } from './notification-provider';

/**
 * Sin credenciales reales de WhatsApp Business API todavía (eso vive en
 * CredencialTenant, cifradas, configurables por tenant — sección 7). Este
 * stub deja correr el resto del pipeline (cola, reintentos, mensajes_log)
 * en local sin depender de una cuenta real. Cuando haya credenciales,
 * esta clase se reemplaza por la integración real sin tocar el resto del
 * sistema — es exactamente para eso que existe la interfaz.
 */
export class WhatsAppProviderStub implements NotificationProvider {
  async enviar(envio: EnvioNotificacion): Promise<void> {
    console.log(`[WhatsApp stub] a ${envio.destinatario}: ${envio.mensaje}`);
  }
}
