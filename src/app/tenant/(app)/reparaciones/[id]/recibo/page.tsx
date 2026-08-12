import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { withTenant } from '@/lib/rls';
import { presignLogoView } from '@/lib/storage/r2';
import { PrintButton } from '@/components/tenant/print-button';
import { FormatoSwitcher } from '@/components/tenant/formato-switcher';
import { claseFormato, clasePlantilla, reglaPaginaImpresion, esFormatoValido } from '@/lib/facturas/formato';

function formatoFecha(fecha: Date | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

function formatoCOP(valor: number | null): string {
  if (valor == null) return 'Por definir';
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

/**
 * Comprobante de INGRESO (sección 4.1): no es la factura final (esa se
 * genera al entregar, ver /comprobante). Es el recibo que el mostrador
 * imprime/entrega al cliente al recibir el equipo — número de orden y
 * política de custodia/bodegaje explícitos, como pide el documento.
 *
 * La plantilla (sección 5) es la que el tenant eligió en Configuración; el
 * formato tiene ese mismo valor por defecto pero se puede cambiar
 * puntualmente por querystring (?formato=...) sin afectar la preferencia
 * guardada del tenant.
 */
export default async function ReciboIngresoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ formato?: string }>;
}) {
  const session = await requireSession();
  const [{ id }, { formato: formatoParam }] = await Promise.all([params, searchParams]);

  const reparacion = await withTenant(session.user.tenantId, (tx) =>
    tx.reparacion.findUnique({
      where: { id },
      include: {
        tenant: true,
        cliente: true,
        equipo: true,
      },
    }),
  );

  if (!reparacion) {
    notFound();
  }

  const { tenant } = reparacion;
  const formato = esFormatoValido(formatoParam) ? formatoParam : tenant.formatoFacturaDefault;
  const logoSrc = tenant.logoUrl ? await presignLogoView(tenant.logoUrl) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: reglaPaginaImpresion(formato) }} />

      <div className="print-actions">
        <a href={`/reparaciones/${reparacion.id}`} className="btn btn-secondary">
          Volver a la orden
        </a>
        <PrintButton />
        <FormatoSwitcher basePath={`/reparaciones/${reparacion.id}/recibo`} formatoActivo={formato} />
      </div>

      <div className={`recibo ${clasePlantilla(tenant.plantillaFacturaDefault)} ${claseFormato(formato)}`}>
        <div className="recibo-header">
          {logoSrc ? <img src={logoSrc} alt="" className="recibo-logo" /> : null}
          <div className="recibo-header-text">
            <h1>{tenant.nombreComercial ?? 'Comprobante de ingreso'}</h1>
            <p className="recibo-meta">
              {tenant.nit ? `NIT ${tenant.nit} · ` : ''}
              {tenant.direccion ?? ''} {tenant.telefono ? `· ${tenant.telefono}` : ''}
            </p>
          </div>
        </div>

        <div className="recibo-body">
          <p className="recibo-fila">
            <strong>Orden</strong> <span>#{reparacion.numeroOrden}</span>
          </p>
          <p className="recibo-fila">
            <span>Fecha de ingreso</span> <span>{formatoFecha(reparacion.fechaRecibido)}</span>
          </p>
          <p className="recibo-fila">
            <span>Entrega estimada</span> <span>{formatoFecha(reparacion.fechaEstimadaEntrega)}</span>
          </p>

          <hr />

          <p className="recibo-fila">
            <span>Cliente</span> <span>{reparacion.cliente.nombre}</span>
          </p>
          <p className="recibo-fila">
            <span>Teléfono</span> <span>{reparacion.cliente.telefono}</span>
          </p>
          <p className="recibo-fila">
            <span>Equipo</span>{' '}
            <span>
              {reparacion.equipo.marca} {reparacion.equipo.modelo}
            </span>
          </p>
          {reparacion.equipo.imei ? (
            <p className="recibo-fila">
              <span>IMEI/Serial</span> <span>{reparacion.equipo.imei}</span>
            </p>
          ) : null}

          <hr />

          <p style={{ margin: 0 }}>
            <strong>Falla reportada</strong>
          </p>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{reparacion.danosReportados}</p>

          <hr />

          <p className="recibo-fila">
            <span>Presupuesto estimado</span> <span>{formatoCOP(reparacion.presupuestoEstimado)}</span>
          </p>

          <div className="recibo-politica">
            <strong>Política de custodia:</strong> {reparacion.diasCustodiaGratisAplicado} días gratis desde la fecha
            de ingreso (hasta el {formatoFecha(reparacion.fechaLimiteCustodia)}). Después de esa fecha se cobra
            bodegaje de {tenant.tarifaBodegajeDiaria.toLocaleString('es-CO')} COP por día hasta la entrega.
            {tenant.diasLimiteAbandono ? (
              <>
                {' '}
                Pasados {tenant.diasLimiteAbandono} días desde el ingreso sin que el equipo sea reclamado, se
                considera abandonado.
              </>
            ) : null}
          </div>

          {tenant.piePaginaFactura ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>{tenant.piePaginaFactura}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
