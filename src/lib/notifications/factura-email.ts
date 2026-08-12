function cop(valor: number): string {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fecha(valor: Date | null): string {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export type FacturaEmailParams = {
  tenant: {
    nombreComercial: string | null;
    nit: string | null;
    direccion: string | null;
    telefono: string | null;
    piePaginaFactura: string | null;
  };
  tieneLogo: boolean;
  clienteNombre: string;
  numeroOrden: number;
  equipoMarca: string;
  equipoModelo: string;
  fechaEntregaReal: Date | null;
  factura: {
    numeroFactura: number;
    subtotalReparacion: number;
    cargoBodegaje: number;
    diasBodegajeCobrados: number;
    total: number;
  };
};

/**
 * HTML de correo autocontenido: los clientes de correo no cargan
 * stylesheets externos ni la mayoría de selectores CSS modernos, así que
 * todo va con estilos inline y una tabla simple — no se reutiliza
 * globals.css. El logo referencia `cid:logo` (adjunto embebido que arma
 * el worker), nunca una URL firmada — esa expira en minutos y el correo
 * se puede abrir días después.
 */
export function facturaEmailHtml(p: FacturaEmailParams): string {
  const nombre = p.tenant.nombreComercial ?? 'Tu taller de confianza';
  const metaPartes = [
    p.tenant.nit ? `NIT ${p.tenant.nit}` : null,
    p.tenant.direccion,
    p.tenant.telefono,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px 12px;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1d23;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e4e9;">
      <div style="background:#2563eb;color:#ffffff;padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${p.tieneLogo ? `<td width="44" style="padding-right:12px;vertical-align:middle;"><img src="cid:logo" alt="" width="44" height="44" style="display:block;border-radius:8px;background:#ffffff;object-fit:contain;" /></td>` : ''}
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:700;line-height:1.3;">${nombre}</div>
              ${metaPartes.length ? `<div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:2px;">${metaPartes.join(' · ')}</div>` : ''}
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:24px;font-size:14px;line-height:1.5;">
        <p style="margin:0 0 16px;">Hola ${p.clienteNombre}, tu equipo ya fue entregado. Este es el comprobante de tu factura.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:2px 0;color:#6b7280;">Factura</td><td style="padding:2px 0;text-align:right;">#${p.factura.numeroFactura}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Orden</td><td style="padding:2px 0;text-align:right;">#${p.numeroOrden}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Fecha de entrega</td><td style="padding:2px 0;text-align:right;">${fecha(p.fechaEntregaReal)}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;">Equipo</td><td style="padding:2px 0;text-align:right;">${p.equipoMarca} ${p.equipoModelo}</td></tr>
        </table>

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
        </table>

        ${p.tenant.piePaginaFactura ? `<p style="margin:20px 0 0;font-size:12px;color:#6b7280;">${p.tenant.piePaginaFactura}</p>` : ''}
      </div>
    </div>
  </body>
</html>`;
}

export function facturaEmailTexto(p: FacturaEmailParams): string {
  const lineas = [
    `Hola ${p.clienteNombre}, tu equipo ${p.equipoMarca} ${p.equipoModelo} (orden #${p.numeroOrden}) fue entregado.`,
    `Factura #${p.factura.numeroFactura} — Total: ${cop(p.factura.total)}`,
  ];
  if (p.factura.cargoBodegaje > 0) {
    lineas.push(`Incluye bodegaje de ${p.factura.diasBodegajeCobrados} día(s): ${cop(p.factura.cargoBodegaje)}`);
  }
  return lineas.join('\n');
}
