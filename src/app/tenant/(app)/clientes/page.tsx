import { requireSession } from '@/lib/auth/guards';
import { listarClientes, buscarClientes } from '@/server/services/clientes';
import { crearClienteAction } from './actions';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { q, error } = await searchParams;
  const clientes = q ? await buscarClientes(session.user.tenantId, q) : await listarClientes(session.user.tenantId);

  return (
    <>
      <div className="page-header">
        <h1>Clientes</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="card">
        <h2>Buscar</h2>
        <form className="form-grid" method="GET">
          <label className="form-field">
            Teléfono, cédula o nombre
            <input name="q" defaultValue={q ?? ''} />
          </label>
          <button type="submit" className="btn btn-secondary">
            Buscar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Nuevo cliente</h2>
        <form action={crearClienteAction} className="form-grid">
          <label className="form-field">
            Nombre
            <input name="nombre" required maxLength={160} />
          </label>
          <label className="form-field">
            Teléfono
            <input name="telefono" required />
          </label>
          <label className="form-field">
            Cédula (opcional)
            <input name="cedula" />
          </label>
          <label className="form-field">
            Email (opcional)
            <input name="email" type="email" />
          </label>
          <button type="submit" className="btn btn-primary">
            Crear
          </button>
        </form>
      </div>

      <div className="card">
        <h2>{q ? `Resultados para "${q}"` : 'Clientes recientes'}</h2>
        {clientes.length === 0 ? (
          <p className="empty-state">Sin resultados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Cédula</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.telefono}</td>
                  <td>{c.cedula ?? '—'}</td>
                  <td>
                    <a className="btn btn-secondary" href={`/clientes/${c.id}`}>
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
