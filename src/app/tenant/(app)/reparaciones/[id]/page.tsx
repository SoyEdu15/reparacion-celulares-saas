import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { obtenerReparacionDetalle } from '@/server/services/reparaciones';
import { decryptPin } from '@/lib/crypto/pin-encryption';
import { ESTADO_LABELS, badgeClassParaEstado } from '@/lib/estados-reparacion';
import {
  tomarEquipoAction,
  completarDiagnosticoAction,
  registrarAprobacionAction,
  avanzarEstadoAction,
  entregarAction,
  marcarFueraDeFlujoAction,
} from './actions';

const ESTADOS_TERMINALES = new Set(['ENTREGADO', 'NO_REPARABLE', 'CANCELADO']);
const ESTADOS_CON_ALTERNA = new Set(['DIAGNOSTICO', 'ESPERANDO_APROBACION_CLIENTE', 'REPARANDO', 'TESTEO']);

function formatoFecha(fecha: Date | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatoCOP(valor: number | null): string {
  if (valor == null) return '—';
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default async function ReparacionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const reparacion = await obtenerReparacionDetalle(session.user.tenantId, id);

  if (!reparacion) {
    notFound();
  }

  const puedeVerPin =
    reparacion.pinDesbloqueo != null &&
    reparacion.tecnicoAsignadoId === session.user.id &&
    !ESTADOS_TERMINALES.has(reparacion.estado);
  const pinDescifrado = puedeVerPin ? decryptPin(reparacion.pinDesbloqueo!.valorCifrado) : null;

  return (
    <>
      <div className="page-header">
        <h1>
          Orden #{reparacion.numeroOrden} — {reparacion.equipo.marca} {reparacion.equipo.modelo}
        </h1>
        <span className={`badge ${badgeClassParaEstado(reparacion.estado)}`}>
          {ESTADO_LABELS[reparacion.estado] ?? reparacion.estado}
        </span>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="card">
        <h2>Datos generales</h2>
        <div className="form-grid" style={{ alignItems: 'start' }}>
          <div>
            <strong>Cliente</strong>
            <p>
              <a href={`/clientes/${reparacion.cliente.id}`}>{reparacion.cliente.nombre}</a>
              <br />
              {reparacion.cliente.telefono}
            </p>
          </div>
          <div>
            <strong>Recibido</strong>
            <p>
              {formatoFecha(reparacion.fechaRecibido)}
              <br />
              por {reparacion.recibidoPor.nombre}
            </p>
          </div>
          <div>
            <strong>Técnico asignado</strong>
            <p>{reparacion.tecnicoAsignado?.nombre ?? '— sin asignar —'}</p>
          </div>
          <div>
            <strong>Fecha límite de custodia</strong>
            <p>{formatoFecha(reparacion.fechaLimiteCustodia)}</p>
          </div>
          <div>
            <strong>Presupuesto estimado</strong>
            <p>
              {formatoCOP(reparacion.presupuestoEstimado)}
              {reparacion.presupuestoEstimado != null && (
                <> — {reparacion.presupuestoEstimadoAceptado ? 'aceptado por el cliente' : 'sin aceptar'}</>
              )}
            </p>
          </div>
          <div>
            <strong>Presupuesto final</strong>
            <p>{formatoCOP(reparacion.presupuestoFinal)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Falla reportada y estado físico</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{reparacion.danosReportados}</p>
        {reparacion.estadoFisico ? <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>{reparacion.estadoFisico}</p> : null}
        {reparacion.diagnosticoTexto ? (
          <>
            <strong>Diagnóstico técnico</strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{reparacion.diagnosticoTexto}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Por {reparacion.diagnosticadoPor?.nombre} — {formatoFecha(reparacion.diagnosticadoEn)}
            </p>
          </>
        ) : null}
      </div>

      {puedeVerPin ? (
        <div className="card" style={{ borderColor: 'var(--warning-border)' }}>
          <h2>PIN/patrón de desbloqueo</h2>
          <p style={{ fontSize: '1.25rem', fontFamily: 'monospace' }}>{pinDescifrado}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Tipo: {reparacion.pinDesbloqueo!.tipo}. Visible solo para ti mientras seas el técnico asignado y la orden
            siga activa.
          </p>
        </div>
      ) : null}

      <div className="card">
        <h2>Fotos ({reparacion.fotos.length})</h2>
        {reparacion.fotos.length === 0 ? (
          <p className="empty-state">Sin fotos.</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {reparacion.fotos.map((foto) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={foto.id}
                src={foto.url}
                alt={foto.esFotoIngreso ? 'Foto de ingreso' : 'Foto de cambio de estado'}
                style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Acciones</h2>

        {reparacion.estado === 'ESPERANDO_TECNICO' ? (
          <form action={tomarEquipoAction}>
            <input type="hidden" name="reparacionId" value={reparacion.id} />
            <button type="submit" className="btn btn-primary">
              Tomar equipo para diagnóstico
            </button>
          </form>
        ) : null}

        {reparacion.estado === 'DIAGNOSTICO' ? (
          <form action={completarDiagnosticoAction} className="form-grid">
            <input type="hidden" name="reparacionId" value={reparacion.id} />
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              Diagnóstico
              <textarea name="diagnosticoTexto" rows={3} required />
            </label>
            <label className="form-field">
              Presupuesto final (dejar en blanco si coincide con el estimado ya aceptado)
              <input type="number" name="presupuestoFinal" min={0} step={1000} />
            </label>
            <button type="submit" className="btn btn-primary">
              Completar diagnóstico
            </button>
          </form>
        ) : null}

        {reparacion.estado === 'ESPERANDO_APROBACION_CLIENTE' ? (
          <form action={registrarAprobacionAction} className="form-grid">
            <input type="hidden" name="reparacionId" value={reparacion.id} />
            <p style={{ gridColumn: '1 / -1', margin: 0 }}>
              Presupuesto a aprobar: <strong>{formatoCOP(reparacion.presupuestoFinal)}</strong>. Regístralo solo
              después de que el cliente lo haya aceptado por teléfono/WhatsApp/presencial.
            </p>
            <label className="form-field">
              Canal de aprobación
              <select name="canalAprobacion" required defaultValue="">
                <option value="" disabled>
                  Selecciona
                </option>
                <option value="LLAMADA">Llamada</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PRESENCIAL">Presencial</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              Registrar aprobación del cliente
            </button>
          </form>
        ) : null}

        {reparacion.estado === 'REPARANDO' || reparacion.estado === 'TESTEO' ? (
          <form action={avanzarEstadoAction} className="form-grid">
            <input type="hidden" name="reparacionId" value={reparacion.id} />
            <input type="hidden" name="nuevoEstado" value={reparacion.estado === 'REPARANDO' ? 'TESTEO' : 'LISTO_PARA_ENTREGA'} />
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              Nota (opcional)
              <input name="notaCorta" maxLength={200} />
            </label>
            <label className="form-field">
              Fotos (0 a 4, opcional)
              <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" multiple />
            </label>
            <button type="submit" className="btn btn-primary">
              {reparacion.estado === 'REPARANDO' ? 'Marcar reparación completada → pasar a testeo' : 'Marcar listo para entrega'}
            </button>
          </form>
        ) : null}

        {reparacion.estado === 'LISTO_PARA_ENTREGA' ? (
          <form action={entregarAction} className="form-grid">
            <input type="hidden" name="reparacionId" value={reparacion.id} />
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              Nota (opcional)
              <input name="notaCorta" maxLength={200} />
            </label>
            <label className="form-field">
              Fotos (0 a 4, opcional)
              <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" multiple />
            </label>
            <button type="submit" className="btn btn-primary">
              Entregar al cliente y generar factura
            </button>
          </form>
        ) : null}

        {ESTADOS_CON_ALTERNA.has(reparacion.estado) ? (
          <details style={{ marginTop: 20 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--danger)', fontSize: '0.875rem' }}>
              No reparable / cancelar
            </summary>
            <form action={marcarFueraDeFlujoAction} className="form-grid" style={{ marginTop: 12 }}>
              <input type="hidden" name="reparacionId" value={reparacion.id} />
              <label className="form-field">
                Motivo
                <input name="notaCorta" maxLength={200} required />
              </label>
              <label className="form-field">
                Estado
                <select name="estado" required defaultValue="">
                  <option value="" disabled>
                    Selecciona
                  </option>
                  <option value="NO_REPARABLE">No reparable</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </label>
              <button type="submit" className="btn btn-danger">
                Confirmar
              </button>
            </form>
          </details>
        ) : null}

        {ESTADOS_TERMINALES.has(reparacion.estado) ? (
          <p className="empty-state">Esta orden ya está en un estado final.</p>
        ) : null}

        {reparacion.estado === 'ENTREGADO' ? (
          <a className="btn btn-secondary" href={`/reparaciones/${reparacion.id}/comprobante`}>
            Ver comprobante
          </a>
        ) : null}
      </div>

      <div className="card">
        <h2>Historial</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>De</th>
              <th>A</th>
              <th>Usuario</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {reparacion.historialEstados.map((h) => (
              <tr key={h.id}>
                <td>{formatoFecha(h.createdAt)}</td>
                <td>{h.estadoAnterior ? ESTADO_LABELS[h.estadoAnterior] ?? h.estadoAnterior : '—'}</td>
                <td>{ESTADO_LABELS[h.estadoNuevo] ?? h.estadoNuevo}</td>
                <td>{h.usuario.nombre}</td>
                <td>{h.notaCorta ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
