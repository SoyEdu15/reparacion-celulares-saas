import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { obtenerEquipo } from '@/server/services/equipos';
import { editarEquipoAction } from '../actions';

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
    </>
  );
}
