import type { MetodoPago, TipoPagoReparacion } from '@prisma/client';
import { formatoCOP, METODO_PAGO_LABELS, TIPO_PAGO_REPARACION_LABELS } from '@/lib/cuentas-labels';
import {
  eliminarPagoAction,
  registrarAbonoAction,
  registrarDevolucionAction,
} from '@/app/tenant/(app)/reparaciones/[id]/pagos-actions';

type Pago = {
  id: string;
  tipo: TipoPagoReparacion;
  monto: number;
  metodoPago: MetodoPago;
  nota: string | null;
  fecha: Date;
  registradoPor: { nombre: string };
};

const ABIERTA = (estado: string) => !['ENTREGADO', 'NO_REPARABLE', 'CANCELADO'].includes(estado);

function fecha(f: Date) {
  return new Date(f).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
}

function MetodoSelect() {
  return (
    <select name="metodoPago" defaultValue="EFECTIVO">
      {Object.entries(METODO_PAGO_LABELS).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

/**
 * Tarjeta "Pagos del cliente": cada abono con su fecha y cómo pagó, cuánto
 * falta, y el pago del saldo al entregar. Lo que entra aquí aparece en la
 * caja del día en Ventas y Cuentas.
 */
export function PagosReparacion({
  reparacionId,
  estado,
  pagos,
  totalACobrar,
  totalEsFinal,
  esDueno,
}: {
  reparacionId: string;
  estado: string;
  pagos: Pago[];
  totalACobrar: number | null;
  totalEsFinal: boolean;
  esDueno: boolean;
}) {
  const neto = pagos.reduce((s, p) => s + (p.tipo === 'DEVOLUCION' ? -p.monto : p.monto), 0);
  const falta = totalACobrar != null ? totalACobrar - neto : null;
  const abierta = ABIERTA(estado);
  const puedeDevolver = esDueno && (estado === 'NO_REPARABLE' || estado === 'CANCELADO') && neto > 0;

  return (
    <div className="card" id="pagos">
      <h2>Pagos del cliente</h2>

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <span>{totalEsFinal ? 'Total cobrado' : 'Total a cobrar'}</span>
          <strong>{totalACobrar != null ? formatoCOP(totalACobrar) : 'Sin presupuesto'}</strong>
        </div>
        <div className="kpi">
          <span>Ha pagado</span>
          <strong className="texto-ok">{formatoCOP(neto)}</strong>
        </div>
        <div className={`kpi ${falta != null && falta > 0 ? 'kpi-alerta' : 'kpi-ok'}`}>
          <span>{falta != null && falta < 0 ? 'Abonó de más' : 'Falta por pagar'}</span>
          <strong>{falta != null ? formatoCOP(Math.abs(falta)) : '—'}</strong>
        </div>
      </div>

      {pagos.length === 0 ? (
        <p className="empty-state">El cliente no ha dejado abonos.</p>
      ) : (
        <div className="tabla-scroll">
          <table className="data-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cómo pagó</th>
                <th className="num">Monto</th>
                {esDueno ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => {
                const borrable = p.tipo === 'DEVOLUCION' || (p.tipo === 'ABONO' && abierta);
                return (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fecha(p.fecha)}</td>
                    <td>
                      {TIPO_PAGO_REPARACION_LABELS[p.tipo]}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>
                        {p.registradoPor.nombre}
                        {p.nota ? ` · ${p.nota}` : ''}
                      </small>
                    </td>
                    <td>{METODO_PAGO_LABELS[p.metodoPago]}</td>
                    <td className={`num ${p.tipo === 'DEVOLUCION' ? 'texto-danger' : ''}`}>
                      {p.tipo === 'DEVOLUCION' ? '−' : ''}
                      {formatoCOP(p.monto)}
                    </td>
                    {esDueno ? (
                      <td>
                        {borrable ? (
                          <form action={eliminarPagoAction}>
                            <input type="hidden" name="pagoId" value={p.id} />
                            <input type="hidden" name="reparacionId" value={reparacionId} />
                            <button type="submit" className="btn btn-danger btn-sm">
                              Borrar
                            </button>
                          </form>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {abierta ? (
        <form action={registrarAbonoAction} className="form-grid">
          <input type="hidden" name="reparacionId" value={reparacionId} />
          <label className="form-field">
            Nuevo abono
            <div className="input-prefijo">
              <span className="input-prefijo-tag">$</span>
              <input name="monto" inputMode="numeric" placeholder="0" required />
            </div>
          </label>
          <label className="form-field">
            ¿Cómo pagó?
            <MetodoSelect />
          </label>
          <label className="form-field">
            Nota (opcional)
            <input name="nota" maxLength={200} />
          </label>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'end' }}>
            Registrar abono
          </button>
        </form>
      ) : null}

      {puedeDevolver ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.875rem' }}>Devolverle plata al cliente</summary>
          <form action={registrarDevolucionAction} className="form-grid" style={{ marginTop: 12 }}>
            <input type="hidden" name="reparacionId" value={reparacionId} />
            <label className="form-field">
              Monto a devolver
              <div className="input-prefijo">
                <span className="input-prefijo-tag">$</span>
                <input name="monto" inputMode="numeric" defaultValue={neto.toLocaleString('es-CO')} required />
              </div>
            </label>
            <label className="form-field">
              ¿Cómo se lo devolviste?
              <MetodoSelect />
            </label>
            <label className="form-field">
              Nota (opcional)
              <input name="nota" maxLength={200} />
            </label>
            <button type="submit" className="btn btn-danger" style={{ alignSelf: 'end' }}>
              Registrar devolución
            </button>
          </form>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '8px 0 0' }}>
            Si no le devuelves el abono, queda como ingreso del local el día que se cerró la orden.
          </p>
        </details>
      ) : null}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '10px 0 0' }}>
        Cada abono entra a la caja del día en que se recibe. Al entregar se registra lo que falta. La ganancia de la
        reparación se cuenta completa el día de la entrega.
      </p>
    </div>
  );
}
