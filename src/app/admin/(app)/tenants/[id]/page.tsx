import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin-guards';
import { obtenerTenant } from '@/server/services/admin-tenants';
import { cambiarEstadoAction, crearDuenoAction, restablecerPasswordAction } from '../actions';

function formatoFecha(fecha: Date): string {
  return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function TenantDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; passwordTemporal?: string }>;
}) {
  await requireSuperAdmin();
  const [{ id }, { error, passwordTemporal }] = await Promise.all([params, searchParams]);
  const tenant = await obtenerTenant(id);

  if (!tenant) {
    notFound();
  }

  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN ?? 'localhost:3000';
  const urlTenant = `http://${tenant.subdominio}.${rootDomain}`;

  return (
    <>
      <div className="page-header">
        <h1>{tenant.nombreComercial ?? tenant.subdominio}</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {passwordTemporal ? (
        <p className="form-success">
          Contraseña temporal generada: <strong style={{ fontFamily: 'monospace' }}>{passwordTemporal}</strong>{' '}
          — pásasela al usuario ahora, no queda guardada en ningún lado y esta página no la vuelve a mostrar.
        </p>
      ) : null}

      <div className="card">
        <h2>Estado de la suscripción</h2>
        <p>
          Estado actual: <strong>{tenant.estado}</strong>
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          <a href={urlTenant} target="_blank" rel="noreferrer">
            {urlTenant}
          </a>
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <form action={cambiarEstadoAction}>
            <input type="hidden" name="id" value={tenant.id} />
            <input type="hidden" name="estado" value="ACTIVO" />
            <button type="submit" className="btn btn-primary" disabled={tenant.estado === 'ACTIVO'}>
              Activar
            </button>
          </form>
          <form action={cambiarEstadoAction}>
            <input type="hidden" name="id" value={tenant.id} />
            <input type="hidden" name="estado" value="MOROSO" />
            <button type="submit" className="btn btn-secondary" disabled={tenant.estado === 'MOROSO'}>
              Marcar moroso
            </button>
          </form>
          <form action={cambiarEstadoAction}>
            <input type="hidden" name="id" value={tenant.id} />
            <input type="hidden" name="estado" value="SUSPENDIDO" />
            <button type="submit" className="btn btn-danger" disabled={tenant.estado === 'SUSPENDIDO'}>
              Suspender
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2>Datos del negocio</h2>
        <div className="form-grid">
          <div>
            <strong>NIT</strong>
            <p>{tenant.nit ?? '—'}</p>
          </div>
          <div>
            <strong>Dirección</strong>
            <p>{tenant.direccion ?? '—'}</p>
          </div>
          <div>
            <strong>Teléfono</strong>
            <p>{tenant.telefono ?? '—'}</p>
          </div>
          <div>
            <strong>Días custodia gratis</strong>
            <p>{tenant.diasCustodiaGratis}</p>
          </div>
          <div>
            <strong>Reparaciones</strong>
            <p>{tenant._count.reparaciones}</p>
          </div>
          <div>
            <strong>Clientes</strong>
            <p>{tenant._count.clientes}</p>
          </div>
        </div>
      </div>

      {tenant.usuarios.length === 0 ? (
        <div className="card" style={{ borderColor: 'var(--warning-border)' }}>
          <h2>Este tenant no tiene ningún usuario todavía</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
            Sin un dueño, nadie puede iniciar sesión en {urlTenant}. Créalo acá.
          </p>
          <form action={crearDuenoAction} className="form-grid">
            <input type="hidden" name="tenantId" value={tenant.id} />
            <label className="form-field">
              Nombre
              <input name="nombre" required maxLength={120} />
            </label>
            <label className="form-field">
              Email
              <input name="email" type="email" required />
            </label>
            <label className="form-field">
              Contraseña temporal
              <input name="password" type="password" required minLength={8} />
            </label>
            <button type="submit" className="btn btn-primary">
              Crear dueño
            </button>
          </form>
        </div>
      ) : null}

      <div className="card">
        <h2>Usuarios ({tenant.usuarios.length})</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenant.usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{u.rol}</td>
                <td>
                  <span className={`badge ${u.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <form action={restablecerPasswordAction}>
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="usuarioId" value={u.id} />
                    <button type="submit" className="btn btn-secondary">
                      Restablecer contraseña
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Historial de acciones de super-admin sobre este tenant</h2>
        {tenant.auditLogsAdmin.length === 0 ? (
          <p className="empty-state">Sin acciones registradas.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Admin</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {tenant.auditLogsAdmin.map((log) => (
                <tr key={log.id}>
                  <td>{formatoFecha(log.createdAt)}</td>
                  <td>{log.superAdmin.nombre}</td>
                  <td>{log.accion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
