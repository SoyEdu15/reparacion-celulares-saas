import { createTransport } from 'nodemailer';
import type { NotificationProvider, EnvioNotificacion } from './notification-provider';

/** SMTP genérico — Maildev en local, cualquier SMTP real en producción. */
export class EmailProvider implements NotificationProvider {
  private transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  async enviar(envio: EnvioNotificacion): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.PLATFORM_NAME ?? 'Taller de reparaciones',
      to: envio.destinatario,
      subject: envio.asunto ?? 'Actualización de tu reparación',
      text: envio.mensaje,
    });
  }
}
