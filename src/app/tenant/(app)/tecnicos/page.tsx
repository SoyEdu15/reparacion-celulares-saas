import { requireDueno } from '@/lib/auth/guards';
import { listarUsuarios } from '@/server/services/usuarios';
import { crearTecnicoAction, toggleActivoTecnicoAction } from './actions';

export default async function TecnicosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireDueno();
  const [usuarios, { error, ok }] = await Promise.all([listarUsuarios(session.user.tenantId), searchParams]);

  return (
    <>
      <div className="page-header">
        <h1>Técnicos</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {ok ? <p className="form-success">Guardado.</p> : null}

      <div className="card">
        <h2>Nuevo técnico</h2>
        <form action={crearTecnicoAction} className="form-grid">
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
            Crear técnico
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Equipo del taller</h2>
        {usuarios.length === 0 ? (
          <p className="empty-state">Todavía no hay usuarios.</p>
        ) : (
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
              {usuarios.map((u) => (
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
                    {u.rol === 'TECNICO' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a className="btn btn-secondary" href={`/tecnicos/${u.id}`}>
                          Editar
                        </a>
                        <form action={toggleActivoTecnicoAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="activo" value={(!u.activo).toString()} />
                          <button type="submit" className={u.activo ? 'btn btn-danger' : 'btn btn-secondary'}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </form>
                      </div>
                    ) : null}
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
