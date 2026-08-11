import { requireDueno } from '@/lib/auth/guards';
import { obtenerConfiguracion } from '@/server/services/configuracion-tenant';
import { actualizarConfiguracionAction, subirLogoAction } from './actions';

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireDueno();
  const [tenant, { error, ok }] = await Promise.all([
    obtenerConfiguracion(session.user.tenantId),
    searchParams,
  ]);

  return (
    <>
      <div className="page-header">
        <h1>Configuración del negocio</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {ok ? <p className="form-success">Guardado.</p> : null}

      <div className="card">
        <h2>Logo</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {tenant.logoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logoPreviewUrl}
              alt="Logo actual"
              style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}
            />
          ) : (
            <p className="empty-state" style={{ padding: 0 }}>
              Sin logo todavía.
            </p>
          )}
          <form action={subirLogoAction} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" required />
            <button type="submit" className="btn btn-secondary">
              Subir
            </button>
          </form>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8 }}>JPG, PNG o WebP, máximo 2MB.</p>
      </div>

      <form action={actualizarConfiguracionAction}>
        <div className="card">
          <h2>Datos comerciales</h2>
          <div className="form-grid">
            <label className="form-field">
              Nombre comercial
              <input name="nombreComercial" required maxLength={160} defaultValue={tenant.nombreComercial ?? ''} />
            </label>
            <label className="form-field">
              NIT
              <input name="nit" maxLength={30} defaultValue={tenant.nit ?? ''} />
            </label>
            <label className="form-field">
              Dirección
              <input name="direccion" maxLength={200} defaultValue={tenant.direccion ?? ''} />
            </label>
            <label className="form-field">
              Teléfono
              <input name="telefono" maxLength={20} defaultValue={tenant.telefono ?? ''} />
            </label>
          </div>
        </div>

        <div className="card">
          <h2>Facturación</h2>
          <div className="form-grid">
            <label className="form-field">
              Plantilla de factura
              <select name="plantillaFacturaDefault" defaultValue={tenant.plantillaFacturaDefault}>
                <option value="CLASICA">Clásica</option>
                <option value="MODERNA">Moderna</option>
                <option value="MINIMALISTA">Minimalista</option>
              </select>
            </label>
            <label className="form-field">
              Formato por defecto
              <select name="formatoFacturaDefault" defaultValue={tenant.formatoFacturaDefault}>
                <option value="TERMICO_58MM">Térmico 58mm</option>
                <option value="TERMICO_80MM">Térmico 80mm</option>
                <option value="CARTA_A4">Carta / A4</option>
              </select>
            </label>
            <label className="form-field">
              Email remitente de facturas (opcional)
              <input name="remitenteEmailFacturas" type="email" defaultValue={tenant.remitenteEmailFacturas ?? ''} />
            </label>
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              Pie de página / texto legal
              <textarea name="piePaginaFactura" rows={2} maxLength={500} defaultValue={tenant.piePaginaFactura ?? ''} />
            </label>
          </div>
        </div>

        <div className="card">
          <h2>Custodia y bodegaje</h2>
          <div className="form-grid">
            <label className="form-field">
              Días de custodia gratis
              <input type="number" name="diasCustodiaGratis" min={0} required defaultValue={tenant.diasCustodiaGratis} />
            </label>
            <label className="form-field">
              Tarifa de bodegaje diaria (COP)
              <input type="number" name="tarifaBodegajeDiaria" min={0} step={1000} required defaultValue={tenant.tarifaBodegajeDiaria} />
            </label>
            <label className="form-field">
              Intervalo de recordatorio (días)
              <input type="number" name="intervaloRecordatorioDias" min={1} required defaultValue={tenant.intervaloRecordatorioDias} />
            </label>
            <label className="form-field">
              Días límite antes de considerar abandonado
              <input type="number" name="diasLimiteAbandono" min={1} required defaultValue={tenant.diasLimiteAbandono} />
            </label>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8 }}>
            Solo afecta órdenes nuevas — las ya creadas conservan la política vigente cuando ingresaron.
          </p>
        </div>

        <div className="card">
          <h2>Garantía</h2>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', marginBottom: 12 }}>
            <input type="checkbox" name="garantiaActiva" defaultChecked={tenant.garantiaActiva} />
            Ofrecer garantía por defecto
          </label>
          <label className="form-field" style={{ maxWidth: 240 }}>
            Días de garantía por defecto
            <input type="number" name="diasGarantiaDefault" min={0} required defaultValue={tenant.diasGarantiaDefault} />
          </label>
        </div>

        <div className="card">
          <h2>PIN/patrón de desbloqueo</h2>
          <label className="form-field" style={{ maxWidth: 320 }}>
            Purgar automáticamente después de (días desde la entrega)
            <input type="number" name="diasPurgaPin" min={1} placeholder="Vacío = sin purga automática" defaultValue={tenant.diasPurgaPin ?? ''} />
          </label>
        </div>

        <div className="card">
          <h2>Canales de notificación</h2>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', marginBottom: 8 }}>
            <input type="checkbox" name="whatsappActivo" defaultChecked={tenant.whatsappActivo} />
            WhatsApp activo
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem' }}>
            <input type="checkbox" name="emailActivo" defaultChecked={tenant.emailActivo} />
            Email activo
          </label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8 }}>
            WhatsApp todavía no está conectado a una cuenta real de WhatsApp Business — activarlo deja todo el
            pipeline funcionando, pero el envío real llega cuando se configuren las credenciales.
          </p>
        </div>

        <button type="submit" className="btn btn-primary">
          Guardar configuración
        </button>
      </form>
    </>
  );
}
