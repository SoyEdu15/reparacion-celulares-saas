export type TenantBranding = {
  nombreComercial: string | null;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  piePaginaFactura: string | null;
};

/**
 * Envoltorio visual compartido por TODOS los correos salientes (cambio de
 * estado, recordatorio de custodia, factura de entrega) — mismo header con
 * logo + nombre del negocio, misma tarjeta, mismo pie de página. Cada
 * plantilla solo arma su `cuerpoHtml` propio y lo pasa por acá, así que
 * ningún correo se manda "a medias" sin la marca del taller.
 *
 * Todo con estilos inline (los clientes de correo no cargan stylesheets
 * externos ni la mayoría de selectores CSS modernos). El logo referencia
 * `cid:logo` (adjunto embebido que arma el worker), nunca una URL firmada
 * — esa expira en minutos y el correo se puede abrir días después.
 */
export function emailShellHtml(params: { tenant: TenantBranding; tieneLogo: boolean; cuerpoHtml: string }): string {
  const nombre = params.tenant.nombreComercial ?? 'Tu taller de confianza';
  const metaPartes = [
    params.tenant.nit ? `NIT ${params.tenant.nit}` : null,
    params.tenant.direccion,
    params.tenant.telefono,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px 12px;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1d23;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e4e9;">
      <div style="background:#2563eb;color:#ffffff;padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${params.tieneLogo ? `<td width="44" style="padding-right:12px;vertical-align:middle;"><img src="cid:logo" alt="" width="44" height="44" style="display:block;border-radius:8px;background:#ffffff;object-fit:contain;" /></td>` : ''}
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:700;line-height:1.3;">${nombre}</div>
              ${metaPartes.length ? `<div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:2px;">${metaPartes.join(' · ')}</div>` : ''}
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:24px;font-size:14px;line-height:1.5;">
        ${params.cuerpoHtml}
        ${params.tenant.piePaginaFactura ? `<p style="margin:20px 0 0;font-size:12px;color:#6b7280;">${params.tenant.piePaginaFactura}</p>` : ''}
      </div>
    </div>
  </body>
</html>`;
}

/** Grid de fotos embebidas (cada una referenciada por su Content-ID, ver descargarFoto en r2.ts). */
export function fotosGridHtml(cids: string[], titulo?: string): string {
  if (cids.length === 0) return '';
  const celdas = cids
    .map(
      (cid) =>
        `<td style="padding:3px;"><img src="cid:${cid}" width="88" height="88" style="display:block;width:88px;height:88px;object-fit:cover;border-radius:8px;border:1px solid #e2e4e9;" /></td>`,
    )
    .join('');
  return `
        ${titulo ? `<p style="margin:16px 0 8px;font-weight:700;">${titulo}</p>` : ''}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:${titulo ? '0' : '16px'};"><tr>${celdas}</tr></table>`;
}

export function cop(valor: number): string {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export function fechaLarga(valor: Date | null): string {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}
