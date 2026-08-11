/**
 * Interfaz desacoplada (sección 2): cada canal (WhatsApp, email, y SMS a
 * futuro) implementa esto. El worker de la cola de notificaciones elige
 * la implementación según el canal del MensajeLog, sin saber nada de
 * proveedores concretos.
 */
export type EnvioNotificacion = {
  destinatario: string;
  asunto?: string;
  mensaje: string;
};

export interface NotificationProvider {
  enviar(envio: EnvioNotificacion): Promise<void>;
}
