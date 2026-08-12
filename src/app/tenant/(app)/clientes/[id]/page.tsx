import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { obtenerCliente } from '@/server/services/clientes';
import { quitarPrefijoPais } from '@/lib/validation/telefono';
import { editarClienteAction } from '../actions';
import { crearEquipoAction } from '../../equipos/actions';

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireSession();
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams]);
  const cliente = await obtenerCliente(session.user.tenantId, id);

  if (!cliente) {
    notFound();
  }

  return (
    <>
      <div className="page-header">
        <h1>{cliente.nombre}</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {ok ? <p className="form-success">Guardado.</p> : null}

      <div className="card">
        <h2>Datos del cliente</h2>
        <form action={editarClienteAction} className="form-grid">
          <input type="hidden" name="id" value={cliente.id} />
          <label className="form-field">
            Nombre
            <input name="nombre" required maxLength={160} defaultValue={cliente.nombre} />
          </label>
          <label className="form-field">
            Teléfono
            <div className="input-prefijo">
              <span className="input-prefijo-tag">+57</span>
              <input
                name="telefono"
                required
                inputMode="numeric"
                maxLength={10}
                defaultValue={quitarPrefijoPais(cliente.telefono)}
              />
            </div>
          </label>
          <label className="form-field">
            Cédula
            <input name="cedula" defaultValue={cliente.cedula ?? ''} />
          </label>
          <label className="form-field">
            Email
            <input name="email" type="email" defaultValue={cliente.email ?? ''} />
          </label>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Agregar equipo</h2>
        <form action={crearEquipoAction} className="form-grid">
          <input type="hidden" name="clienteId" value={cliente.id} />
          <label className="form-field">
            Marca
            <input name="marca" required />
          </label>
          <label className="form-field">
            Modelo
            <input name="modelo" required />
          </label>
          <label className="form-field">
            Color
            <input name="color" />
          </label>
          <label className="form-field">
            IMEI/Serial
            <input name="imei" />
          </label>
          <button type="submit" className="btn btn-primary">
            Agregar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Equipos</h2>
        {cliente.equipos.length === 0 ? (
          <p className="empty-state">Sin equipos registrados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Modelo</th>
                <th>IMEI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cliente.equipos.map((e) => (
                <tr key={e.id}>
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
