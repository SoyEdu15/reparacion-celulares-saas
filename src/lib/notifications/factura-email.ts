import { emailShellHtml, fotosGridHtml, cop, fechaLarga, type TenantBranding } from './email-shell';

export type FacturaEmailParams = {
  tenant: TenantBranding;
  tieneLogo: boolean;
  clienteNombre: string;
  numeroOrden: number;
  equipoMarca: string;
  equipoModelo: string;
  fechaEntregaReal: Date | null;
  diagnosticoTexto: string | null;
  fotosCids: string[];
  factura: {
    numeroFactura: number;
    subtotalReparacion: number;
    cargoBodegaje: number;
    diasBodegajeCobrados: number;
    anticipo: number;
    total: number;
  };
};

export function facturaEmailHtml(p: FacturaEmailParams): string {
  const cuerpo = `
        <p style="margin:0 0 16px;">Hola ${p.clienteNombre}, tu equipo ya fue entregado. Este es el comprobante de tu factura.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:2px 0;color:#6b7280;">Factura</td><td style="padding:2px 0;text-align:right;">#${p.factura.numeroFactura}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Orden</td><td style="padding:2px 0;text-align:right;">#${p.numeroOrden}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Fecha de entrega</td><td style="padding:2px 0;text-align:right;">${fechaLarga(p.fechaEntregaReal)}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Equipo</td><td style="padding:2px 0;text-align:right;">${p.equipoMarca} ${p.equipoModelo}</td></tr>
        </table>

        ${
          p.diagnosticoTexto
            ? `<div style="background:#f4f5f7;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
                 <p style="margin:0 0 4px;font-weight:700;font-size:13px;">Trabajo realizado</p>
                 <p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap;">${p.diagnosticoTexto}</p>
               </div>`
            : ''
        }

        <hr style="border:none;border-top:1px dashed #e2e4e9;margin:16px 0;" />

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
          <tr><td style="padding:4px 0;">Reparación</td><td style="padding:4px 0;text-align:right;">${cop(p.factura.subtotalReparacion)}</td></tr>
          ${
            p.factura.cargoBodegaje > 0
              ? `<tr><td style="padding:4px 0;">Bodegaje (${p.factura.diasBodegajeCobrados} día(s))</td><td style="padding:4px 0;text-align:right;">${cop(p.factura.cargoBodegaje)}</td></tr>`
              : ''
          }
          <tr>
            <td style="padding:10px 0 0;font-weight:700;font-size:16px;border-top:1px solid #e2e4e9;">Total</td>
            <td style="padding:10px 0 0;font-weight:700;font-size:16px;text-align:right;border-top:1px solid #e2e4e9;">${cop(p.factura.total)}</td>
          </tr>
          ${
            p.factura.anticipo > 0
              ? `<tr><td style="padding:6px 0 0;">Anticipo pagado</td><td style="padding:6px 0 0;text-align:right;">−${cop(p.factura.anticipo)}</td></tr>
                 <tr><td style="padding:6px 0 0;font-weight:700;">Saldo a pagar</td><td style="padding:6px 0 0;text-align:right;font-weight:700;">${cop(p.factura.total - p.factura.anticipo)}</td></tr>`
              : ''
          }
        </table>
        ${fotosGridHtml(p.fotosCids, 'Fotos de la entrega')}`;

  return emailShellHtml({ tenant: p.tenant, tieneLogo: p.tieneLogo, cuerpoHtml: cuerpo });
}

export function facturaEmailTexto(p: FacturaEmailParams): string {
  const lineas = [
    `Hola ${p.clienteNombre}, tu equipo ${p.equipoMarca} ${p.equipoModelo} (orden #${p.numeroOrden}) fue entregado.`,
    `Factura #${p.factura.numeroFactura} — Total: ${cop(p.factura.total)}`,
  ];
  if (p.factura.cargoBodegaje > 0) {
    lineas.push(`Incluye bodegaje de ${p.factura.diasBodegajeCobrados} día(s): ${cop(p.factura.cargoBodegaje)}`);
  }
  if (p.factura.anticipo > 0) {
    lineas.push(`Anticipo pagado: ${cop(p.factura.anticipo)} — Saldo a pagar: ${cop(p.factura.total - p.factura.anticipo)}`);
  }
  return lineas.join('\n');
}
