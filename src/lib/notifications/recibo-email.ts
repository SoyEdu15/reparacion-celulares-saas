import { emailShellHtml, fotosGridHtml, cop, type TenantBranding } from './email-shell';

export type ReciboEmailParams = {
  tenant: TenantBranding;
  tieneLogo: boolean;
  clienteNombre: string;
  numeroOrden: number;
  equipoMarca: string;
  equipoModelo: string;
  equipoImei: string | null;
  danosReportados: string;
  estadoFisico: string | null;
  presupuestoEstimado: number | null;
  anticipo: number;
  diasCustodiaGratis: number;
  fotosCids: string[];
};

/**
 * Comprobante de ingreso por correo — le sirve al cliente como soporte
 * desde el primer momento, no solo al final con la factura. Misma idea
 * que el recibo impreso (ver /reparaciones/[id]/recibo) pero autocontenido
 * para email, con las fotos del equipo al recibirlo.
 */
export function reciboEmailHtml(p: ReciboEmailParams): string {
  const cuerpo = `
        <p style="margin:0 0 16px;">Hola ${p.clienteNombre}, este es el comprobante de ingreso de tu equipo. Guárdalo como soporte de tu reparación.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:2px 0;color:#6b7280;">Orden</td><td style="padding:2px 0;text-align:right;">#${p.numeroOrden}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Equipo</td><td style="padding:2px 0;text-align:right;">${p.equipoMarca} ${p.equipoModelo}</td></tr>
          ${p.equipoImei ? `<tr><td style="padding:2px 0;color:#6b7280;">IMEI/Serial</td><td style="padding:2px 0;text-align:right;">${p.equipoImei}</td></tr>` : ''}
        </table>

        <hr style="border:none;border-top:1px dashed #e2e4e9;margin:16px 0;" />

        <p style="margin:0 0 4px;font-weight:700;">Falla reportada</p>
        <p style="margin:0 0 12px;white-space:pre-wrap;">${p.danosReportados}</p>
        ${p.estadoFisico ? `<p style="margin:0 0 4px;font-weight:700;">Estado físico</p><p style="margin:0;white-space:pre-wrap;color:#374151;">${p.estadoFisico}</p>` : ''}

        ${
          p.presupuestoEstimado != null || p.anticipo > 0
            ? `<hr style="border:none;border-top:1px dashed #e2e4e9;margin:16px 0;" />
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                 ${p.presupuestoEstimado != null ? `<tr><td style="padding:4px 0;">Presupuesto estimado</td><td style="padding:4px 0;text-align:right;">${cop(p.presupuestoEstimado)}</td></tr>` : ''}
                 ${p.anticipo > 0 ? `<tr><td style="padding:4px 0;">Anticipo recibido</td><td style="padding:4px 0;text-align:right;">${cop(p.anticipo)}</td></tr>` : ''}
               </table>`
            : ''
        }

        <div style="background:#f4f5f7;border-radius:8px;padding:12px 14px;font-size:12px;color:#6b7280;margin-top:16px;">
          Política de custodia: ${p.diasCustodiaGratis} días gratis desde el ingreso. Después de esa fecha aplica bodegaje hasta que recojas el equipo.
        </div>

        ${fotosGridHtml(p.fotosCids, 'Fotos del equipo al recibirlo')}`;

  return emailShellHtml({ tenant: p.tenant, tieneLogo: p.tieneLogo, cuerpoHtml: cuerpo });
}

export function reciboEmailTexto(p: ReciboEmailParams): string {
  const lineas = [
    `Hola ${p.clienteNombre}, recibimos tu equipo ${p.equipoMarca} ${p.equipoModelo} (orden #${p.numeroOrden}).`,
    `Falla reportada: ${p.danosReportados}`,
  ];
  if (p.presupuestoEstimado != null) lineas.push(`Presupuesto estimado: ${cop(p.presupuestoEstimado)}`);
  if (p.anticipo > 0) lineas.push(`Anticipo recibido: ${cop(p.anticipo)}`);
  lineas.push(`Custodia gratis: ${p.diasCustodiaGratis} días desde el ingreso.`);
  return lineas.join('\n');
}
