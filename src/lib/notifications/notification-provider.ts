/**
 * Interfaz desacoplada (sección 2): cada canal (WhatsApp, email, y SMS a
 * futuro) implementa esto. El worker de la cola de notificaciones elige
 * la implementación según el canal del MensajeLog, sin saber nada de
 * proveedores concretos.
 *
 * `html`/`attachments`/`replyTo` son opcionales y hoy solo los usa el
 * canal EMAIL (ej. la factura al entregar); `mensaje` siempre va como
 * texto plano, tanto de fallback del email como cuerpo único de WhatsApp.
 */
export type EnvioNotificacion = {
  destinatario: string;
  asunto?: string;
  mensaje: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer; cid?: string; contentType?: string }>;
};

export interface NotificationProvider {
  enviar(envio: EnvioNotificacion): Promise<void>;
}
