import type { EstadoReparacion } from '@prisma/client';
import { requireSession } from '@/lib/auth/guards';
import { listarReparaciones } from '@/server/services/reparaciones';
import { ESTADO_LABELS, ESTADOS_ORDEN, badgeClassParaEstado } from '@/lib/estados-reparacion';

export default async function ReparacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await requireSession();
  const { estado } = await searchParams;
  const reparaciones = await listarReparaciones(
    session.user.tenantId,
    estado && estado in ESTADO_LABELS ? (estado as EstadoReparacion) : undefined,
  );

  return (
    <>
      <div className="page-header">
        <h1>Reparaciones</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: reparaciones.length ? 16 : 0 }}>
          <a href="/reparaciones" className={`btn ${!estado ? 'btn-primary' : 'btn-secondary'}`}>
            Todas
          </a>
          {ESTADOS_ORDEN.map((e) => (
            <a key={e} href={`/reparaciones?estado=${e}`} className={`btn ${estado === e ? 'btn-primary' : 'btn-secondary'}`}>
              {ESTADO_LABELS[e]}
            </a>
          ))}
        </div>

        {reparaciones.length === 0 ? (
          <p className="empty-state">No hay reparaciones con este filtro.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Estado</th>
                <th>Técnico</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reparaciones.map((r) => (
                <tr key={r.id}>
                  <td>{r.numeroOrden}</td>
                  <td>{r.cliente.nombre}</td>
                  <td>
                    {r.equipo.marca} {r.equipo.modelo}
                  </td>
                  <td>
                    <span className={`badge ${badgeClassParaEstado(r.estado)}`}>{ESTADO_LABELS[r.estado] ?? r.estado}</span>
                  </td>
                  <td>{r.tecnicoAsignado?.nombre ?? '—'}</td>
                  <td>
                    <a className="btn btn-secondary" href={`/reparaciones/${r.id}`}>
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
