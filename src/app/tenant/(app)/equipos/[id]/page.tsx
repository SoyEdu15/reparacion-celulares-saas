import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { obtenerEquipo } from '@/server/services/equipos';
import { ESTADO_LABELS, badgeClassParaEstado } from '@/lib/estados-reparacion';
import { editarEquipoAction } from '../actions';

function formatoFecha(fecha: Date | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

function garantiaInfo(fechaFinGarantia: Date | null): { texto: string; clase: string } {
  if (!fechaFinGarantia) return { texto: 'Sin garantía', clase: 'badge-inactivo' };
  const vigente = new Date(fechaFinGarantia) >= new Date();
  return vigente
    ? { texto: `Vigente hasta ${formatoFecha(fechaFinGarantia)}`, clase: 'badge-activo' }
    : { texto: `Venció el ${formatoFecha(fechaFinGarantia)}`, clase: 'badge-danger' };
}

export default async function EquipoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireSession();
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams]);
  const equipo = await obtenerEquipo(session.user.tenantId, id);

  if (!equipo) {
    notFound();
  }

  return (
    <>
      <div className="page-header">
        <h1>
          {equipo.marca} {equipo.modelo}
        </h1>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -12, marginBottom: 20 }}>
        Cliente: <a href={`/clientes/${equipo.cliente.id}`}>{equipo.cliente.nombre}</a>
      </p>

      {error ? <p className="form-error">{error}</p> : null}
      {ok ? <p className="form-success">Guardado.</p> : null}

      <div className="card">
        <h2>Datos del equipo</h2>
        <form action={editarEquipoAction} className="form-grid">
          <input type="hidden" name="id" value={equipo.id} />
          <input type="hidden" name="clienteId" value={equipo.clienteId} />
          <label className="form-field">
            Marca
            <input name="marca" required defaultValue={equipo.marca} />
          </label>
          <label className="form-field">
            Modelo
            <input name="modelo" required defaultValue={equipo.modelo} />
          </label>
          <label className="form-field">
            Color
            <input name="color" defaultValue={equipo.color ?? ''} />
          </label>
          <label className="form-field">
            IMEI/Serial
            <input name="imei" defaultValue={equipo.imei ?? ''} />
          </label>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Historial de reparaciones ({equipo.reparaciones.length})</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
          Revisa acá si el equipo tiene una garantía vigente antes de registrar un ingreso nuevo.
        </p>
        {equipo.reparaciones.length === 0 ? (
          <p className="empty-state">Sin reparaciones registradas todavía.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Falla reportada</th>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Garantía</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {equipo.reparaciones.map((r) => {
                const garantia = garantiaInfo(r.fechaFinGarantia);
                return (
                  <tr key={r.id}>
                    <td>{r.numeroOrden}</td>
                    <td>{formatoFecha(r.fechaRecibido)}</td>
                    <td>{r.danosReportados}</td>
                    <td>{r.tecnicoAsignado?.nombre ?? '—'}</td>
                    <td>
                      <span className={`badge ${badgeClassParaEstado(r.estado)}`}>
                        {ESTADO_LABELS[r.estado] ?? r.estado}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${garantia.clase}`}>{garantia.texto}</span>
                    </td>
                    <td>
                      <a className="btn btn-secondary" href={`/reparaciones/${r.id}`}>
                        Ver
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
