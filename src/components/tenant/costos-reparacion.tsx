import { withTenant } from '@/lib/rls';
import { formatoCOP, TIPO_COSTO_REPARACION_LABELS } from '@/lib/cuentas-labels';
import { listarCostosReparacion } from '@/server/services/gastos';
import { listarProductos } from '@/server/services/inventario';
import {
  agregarCostoReparacionAction,
  eliminarCostoReparacionAction,
} from '@/app/tenant/(app)/reparaciones/[id]/costos-actions';

/**
 * Tarjeta "Costos y ganancia" del detalle de una reparación (solo dueño):
 * cuánto se cobra vs. cuánto costó (repuesto, transporte, insumos).
 */
export async function CostosReparacion({
  tenantId,
  reparacionId,
  presupuesto,
}: {
  tenantId: string;
  reparacionId: string;
  presupuesto: number | null;
}) {
  const [costos, repuestos, factura] = await Promise.all([
    listarCostosReparacion(tenantId, reparacionId),
    listarProductos(tenantId, { categoria: 'REPUESTO' }),
    withTenant(tenantId, (tx) =>
      tx.factura.findFirst({ where: { reparacionId }, orderBy: { createdAt: 'desc' }, select: { total: true } }),
    ),
  ]);
  // Ya entregada: lo cobrado es el total de la factura (incluye bodegaje).
  const cobroEsFinal = factura != null;
  const cobro = factura?.total ?? presupuesto;
  const totalCostos = costos.reduce((s, c) => s + c.monto, 0);
  const ganancia = cobro != null ? cobro - totalCostos : null;

  return (
    <div className="card" id="costos">
      <h2>Costos y ganancia</h2>

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <span>{cobroEsFinal ? 'Cobrado' : 'Se va a cobrar'}</span>
          <strong>{cobro != null ? formatoCOP(cobro) : 'Sin presupuesto'}</strong>
        </div>
        <div className="kpi">
          <span>Me costó</span>
          <strong className="texto-danger">{formatoCOP(totalCostos)}</strong>
        </div>
        <div className={`kpi ${ganancia != null && ganancia < 0 ? 'kpi-alerta' : 'kpi-ok'}`}>
          <span>Ganancia</span>
          <strong>{ganancia != null ? formatoCOP(ganancia) : '—'}</strong>
        </div>
      </div>

      {costos.length > 0 ? (
        <div className="tabla-scroll">
          <table className="data-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Detalle</th>
                <th className="num">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {costos.map((c) => (
                <tr key={c.id}>
                  <td>{TIPO_COSTO_REPARACION_LABELS[c.tipo]}</td>
                  <td>
                    {c.cantidad > 1 ? `${c.cantidad} × ` : ''}
                    {c.descripcion}
                    <br />
                    <small style={{ color: 'var(--text-muted)' }}>{c.registradoPor.nombre}</small>
                  </td>
                  <td className="num">{formatoCOP(c.monto)}</td>
                  <td>
                    <form action={eliminarCostoReparacionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="reparacionId" value={reparacionId} />
                      <button type="submit" className="btn btn-danger btn-sm" title={c.productoId ? 'El repuesto vuelve al inventario' : undefined}>
                        Quitar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form action={agregarCostoReparacionAction} className="form-grid">
        <input type="hidden" name="reparacionId" value={reparacionId} />
        <label className="form-field">
          Tipo de costo
          <select name="tipo" defaultValue="REPUESTO">
            {Object.entries(TIPO_COSTO_REPARACION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {repuestos.length > 0 ? (
          <label className="form-field">
            Del inventario (opcional)
            <select name="productoId" defaultValue="">
              <option value="">— No, lo compré aparte —</option>
              {repuestos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.nombre} — {formatoCOP(p.costoPromedio)} ({p.stock} disp.)
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="form-field">
          Descripción
          <input name="descripcion" maxLength={200} placeholder="Ej. Pantalla comprada en el centro" />
        </label>
        <label className="form-field">
          Costo
          <div className="input-prefijo">
            <span className="input-prefijo-tag">$</span>
            <input name="monto" inputMode="numeric" placeholder="0" />
          </div>
        </label>
        <button type="submit" className="btn btn-primary">
          Agregar costo
        </button>
      </form>
      {repuestos.length > 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '10px 0 0' }}>
          Si eliges un repuesto del inventario se descuenta del stock y el costo se toma solo.
        </p>
      ) : null}
    </div>
  );
}
