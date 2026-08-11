import { requireSuperAdmin } from '@/lib/auth/admin-guards';
import { listarTenants } from '@/server/services/admin-tenants';
import { crearTenantAction } from './actions';

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'badge-activo',
  MOROSO: 'badge-danger',
  SUSPENDIDO: 'badge-danger',
};

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperAdmin();
  const [{ error }, tenants] = await Promise.all([searchParams, listarTenants()]);

  return (
    <>
      <div className="page-header">
        <h1>Tenants</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="card">
        <h2>Nuevo tenant</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
          El dueño queda creado en el mismo paso — sin esto el negocio no tiene con qué iniciar sesión.
        </p>
        <form action={crearTenantAction} className="form-grid">
          <label className="form-field">
            Subdominio
            <input name="subdominio" required placeholder="ej: tallerdemo1" pattern="[a-z0-9-]+" />
          </label>
          <label className="form-field">
            Nombre comercial
            <input name="nombreComercial" required maxLength={160} />
          </label>
          <label className="form-field">
            WhatsApp de soporte (opcional)
            <input name="whatsappContactoSoporte" placeholder="+573001234567" />
          </label>
          <label className="form-field">
            Nombre del dueño
            <input name="duenoNombre" required maxLength={120} />
          </label>
          <label className="form-field">
            Email del dueño
            <input name="duenoEmail" type="email" required />
          </label>
          <label className="form-field">
            Contraseña temporal del dueño
            <input name="duenoPassword" type="password" required minLength={8} />
          </label>
          <button type="submit" className="btn btn-primary">
            Crear
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Todos los tenants ({tenants.length})</h2>
        {tenants.length === 0 ? (
          <p className="empty-state">Sin tenants todavía.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Subdominio</th>
                <th>Estado</th>
                <th>Usuarios</th>
                <th>Reparaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>{t.nombreComercial ?? t.subdominio}</td>
                  <td>{t.subdominio}</td>
                  <td>
                    <span className={`badge ${ESTADO_BADGE[t.estado] ?? 'badge-inactivo'}`}>{t.estado}</span>
                  </td>
                  <td>{t._count.usuarios}</td>
                  <td>{t._count.reparaciones}</td>
                  <td>
                    <a className="btn btn-secondary" href={`/tenants/${t.id}`}>
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
