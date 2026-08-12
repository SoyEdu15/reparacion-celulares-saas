import { createTransport } from 'nodemailer';
import type { NotificationProvider, EnvioNotificacion } from './notification-provider';

/**
 * SMTP genérico — Maildev en local, cualquier proveedor transaccional real
 * en producción (Resend/SES/Postmark/Mailgun/etc, todos hablan SMTP).
 *
 * El remitente SIEMPRE es del dominio propio de la plataforma
 * (PLATFORM_EMAIL_FROM) — nunca un correo del tenant. Los proveedores
 * exigen dominio verificado (SPF/DKIM) para el "From"; usar uno no
 * verificado hace que el correo llegue a spam o se rechace. Si el tenant
 * configuró `remitenteEmailFacturas`, ese va como Reply-To: el cliente
 * puede responder directo al taller aunque el correo salga de nuestro
 * dominio.
 */
export class EmailProvider implements NotificationProvider {
  private transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  async enviar(envio: EnvioNotificacion): Promise<void> {
    const nombre = process.env.PLATFORM_NAME ?? 'Taller de reparaciones';
    const from = process.env.PLATFORM_EMAIL_FROM ? `${nombre} <${process.env.PLATFORM_EMAIL_FROM}>` : nombre;

    await this.transporter.sendMail({
      from,
      to: envio.destinatario,
      replyTo: envio.replyTo,
      subject: envio.asunto ?? 'Actualización de tu reparación',
      text: envio.mensaje,
      html: envio.html,
      attachments: envio.attachments,
    });
  }
}
