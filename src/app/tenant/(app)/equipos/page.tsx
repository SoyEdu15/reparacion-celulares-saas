import { requireSession } from '@/lib/auth/guards';
import { listarEquipos } from '@/server/services/equipos';

export default async function EquiposPage() {
  const session = await requireSession();
  const equipos = await listarEquipos(session.user.tenantId);

  return (
    <>
      <div className="page-header">
        <h1>Equipos</h1>
      </div>

      <div className="card">
        <h2>Equipos recientes</h2>
        {equipos.length === 0 ? (
          <p className="empty-state">Sin equipos registrados. Agrega equipos desde la ficha de un cliente.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>IMEI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((e) => (
                <tr key={e.id}>
                  <td>{e.cliente.nombre}</td>
                  <td>{e.marca}</td>
                  <td>{e.modelo}</td>
                  <td>{e.imei ?? '—'}</td>
                  <td>
                    <a className="btn btn-secondary" href={`/equipos/${e.id}`}>
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
