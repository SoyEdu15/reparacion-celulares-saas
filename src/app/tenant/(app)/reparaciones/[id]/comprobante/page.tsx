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

function formatoCOP(valor: number): string {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

/** Factura final de entrega (sección 5): costo de la reparación + bodegaje si aplica. */
export default async function FacturaPage({
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
        facturas: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  );

  if (!reparacion || reparacion.facturas.length === 0) {
    notFound();
  }

  const factura = reparacion.facturas[0]!;
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
        <FormatoSwitcher basePath={`/reparaciones/${reparacion.id}/comprobante`} formatoActivo={formato} />
      </div>

      <div className={`recibo ${clasePlantilla(tenant.plantillaFacturaDefault)} ${claseFormato(formato)}`}>
        <div className="recibo-header">
          {logoSrc ? <img src={logoSrc} alt="" className="recibo-logo" /> : null}
          <div className="recibo-header-text">
            <h1>{tenant.nombreComercial ?? 'Factura'}</h1>
            <p className="recibo-meta">
              {tenant.nit ? `NIT ${tenant.nit} · ` : ''}
              {tenant.direccion ?? ''} {tenant.telefono ? `· ${tenant.telefono}` : ''}
            </p>
          </div>
        </div>

        <div className="recibo-body">
          <p className="recibo-fila">
            <strong>Factura</strong> <span>#{factura.numeroFactura}</span>
          </p>
          <p className="recibo-fila">
            <span>Orden</span> <span>#{reparacion.numeroOrden}</span>
          </p>
          <p className="recibo-fila">
            <span>Fecha de entrega</span> <span>{formatoFecha(reparacion.fechaEntregaReal)}</span>
          </p>

          <hr />

          <p className="recibo-fila">
            <span>Cliente</span> <span>{reparacion.cliente.nombre}</span>
          </p>
          <p className="recibo-fila">
            <span>Equipo</span>{' '}
            <span>
              {reparacion.equipo.marca} {reparacion.equipo.modelo}
            </span>
          </p>

          <hr />

          <p className="recibo-fila">
            <span>Reparación</span> <span>{formatoCOP(factura.subtotalReparacion)}</span>
          </p>
          {factura.cargoBodegaje > 0 ? (
            <p className="recibo-fila">
              <span>Bodegaje ({factura.diasBodegajeCobrados} día(s))</span>{' '}
              <span>{formatoCOP(factura.cargoBodegaje)}</span>
            </p>
          ) : null}
          <p className="recibo-total">
            <span>Total</span> <span>{formatoCOP(factura.total)}</span>
          </p>

          {tenant.piePaginaFactura ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>{tenant.piePaginaFactura}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
