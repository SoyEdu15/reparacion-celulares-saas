import { requireDueno } from '@/lib/auth/guards';
import { rangoPeriodo } from '@/lib/fechas-bogota';
import {
  CATEGORIA_GASTO_LABELS,
  formatoCOP,
  margenPct,
  METODO_PAGO_LABELS,
  TIPO_VENTA_LABELS,
} from '@/lib/cuentas-labels';
import { resumenCuentas } from '@/server/services/cuentas';
import { resumenInventario } from '@/server/services/inventario';
import { listarVentas } from '@/server/services/ventas';
import { PeriodoFiltro } from '@/components/tenant/periodo-filtro';

const TIPO_MOV_LABELS: Record<string, string> = {
  VENTA: 'Venta',
  FACTURA: 'Reparación entregada',
  GASTO: 'Gasto',
  COSTO_REPARACION: 'Costo reparación',
  COMPRA: 'Compra mercancía',
};

function fechaHora(f: Date): string {
  return new Date(f).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
}

function fechaLarga(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>;
}) {
  const session = await requireDueno();
  const sp = await searchParams;
  const rango = rangoPeriodo(sp.periodo, sp.desde, sp.hasta);
  const tenantId = session.user.tenantId;

  const [r, inventario, ventas] = await Promise.all([
    resumenCuentas(tenantId, rango.desde, rango.hasta),
    resumenInventario(tenantId),
    listarVentas(tenantId, rango.desde, rango.hasta),
  ]);

  const movimientos = [
    ...r.movimientos,
    ...ventas
      .filter((v) => !v.anulada)
      .map((v) => ({
        fecha: v.fecha,
        tipo: 'VENTA' as const,
        descripcion: v.items.map((i) => `${i.cantidad} × ${i.descripcion}`).join(', '),
        ingreso: v.total,
        egreso: 0,
        href: undefined as string | undefined,
      })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const titulo =
    rango.desdeDia === rango.hastaDia
      ? fechaLarga(rango.desdeDia)
      : `${fechaLarga(rango.desdeDia)} — ${fechaLarga(rango.hastaDia)}`;

  return (
    <>
      <div className="page-header">
        <h1>Cuentas del local</h1>
        <a className="btn btn-primary" href="/ventas">
          + Registrar venta
        </a>
      </div>

      <PeriodoFiltro base="/cuentas" periodo={rango.periodo} desdeDia={rango.desdeDia} hastaDia={rango.hastaDia} />
      <p className="periodo-titulo">{titulo}</p>

      <div className="kpi-grid">
        <div className="kpi">
          <span>Ingresos</span>
          <strong>{formatoCOP(r.ingresos)}</strong>
          <small>Ventas + reparaciones entregadas</small>
        </div>
        <div className="kpi">
          <span>Costo de lo vendido</span>
          <strong className="texto-danger">{formatoCOP(r.costos)}</strong>
          <small>Mercancía y repuestos usados</small>
        </div>
        <div className="kpi">
          <span>Gastos del local</span>
          <strong className="texto-danger">{formatoCOP(r.totalGastos)}</strong>
          <small>Arriendo, transporte, insumos…</small>
        </div>
        <div className={`kpi ${r.utilidadNeta >= 0 ? 'kpi-ok' : 'kpi-alerta'}`}>
          <span>Ganancia real</span>
          <strong>{formatoCOP(r.utilidadNeta)}</strong>
          <small>{margenPct(r.ingresos, r.utilidadNeta)} de lo que entró</small>
        </div>
      </div>

      <div className="card">
        <h2>Por tipo de ingreso</h2>
        <div className="tabla-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="num">Cant.</th>
                <th className="num">Ingresó</th>
                <th className="num">Me costó</th>
                <th className="num">Gané</th>
                <th className="num">Margen</th>
              </tr>
            </thead>
            <tbody>
              {r.categorias.map((c) => (
                <tr key={c.tipo}>
                  <td>{c.tipo === 'REPARACION' ? 'Reparaciones' : TIPO_VENTA_LABELS[c.tipo]}</td>
                  <td className="num">{c.cantidad}</td>
                  <td className="num">{formatoCOP(c.ingreso)}</td>
                  <td className="num">{formatoCOP(c.costo)}</td>
                  <td className={`num ${c.ganancia < 0 ? 'texto-danger' : ''}`}>
                    <strong>{formatoCOP(c.ganancia)}</strong>
                  </td>
                  <td className="num">{margenPct(c.ingreso, c.ganancia)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Ganancia bruta</td>
                <td></td>
                <td className="num">{formatoCOP(r.ingresos)}</td>
                <td className="num">{formatoCOP(r.costos)}</td>
                <td className="num">
                  <strong>{formatoCOP(r.gananciaBruta)}</strong>
                </td>
                <td className="num">{margenPct(r.ingresos, r.gananciaBruta)}</td>
              </tr>
              <tr>
                <td>− Gastos del local</td>
                <td></td>
                <td></td>
                <td></td>
                <td className="num texto-danger">{formatoCOP(r.totalGastos)}</td>
                <td></td>
              </tr>
              <tr className="fila-total">
                <td>Ganancia real</td>
                <td></td>
                <td></td>
                <td></td>
                <td className={`num ${r.utilidadNeta < 0 ? 'texto-danger' : 'texto-ok'}`}>
                  {formatoCOP(r.utilidadNeta)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="dos-columnas">
        <div className="card">
          <h2>Gastos por categoría</h2>
          {r.gastosPorCategoria.length === 0 ? (
            <p className="empty-state">Sin gastos en el período.</p>
          ) : (
            <table className="data-table">
              <tbody>
                {r.gastosPorCategoria.map((g) => (
                  <tr key={g.categoria}>
                    <td>{CATEGORIA_GASTO_LABELS[g.categoria]}</td>
                    <td className="num">{formatoCOP(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <a href="/gastos" className="btn btn-secondary btn-sm" style={{ marginTop: 12, display: 'inline-block' }}>
            Registrar gasto
          </a>
        </div>

        <div className="card">
          <h2>Caja (ventas de mostrador)</h2>
          {r.metodos.length === 0 ? (
            <p className="empty-state">Sin ventas de mostrador.</p>
          ) : (
            <table className="data-table">
              <tbody>
                {r.metodos.map((m) => (
                  <tr key={m.metodo}>
                    <td>
                      {METODO_PAGO_LABELS[m.metodo]} <small style={{ color: 'var(--text-muted)' }}>({m.cantidad})</small>
                    </td>
                    <td className="num">{formatoCOP(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '12px 0 0' }}>
            Compras de mercancía en el período: <strong>{formatoCOP(r.comprasMercancia)}</strong> (no restan de la
            ganancia: pasan a ser inventario).
          </p>
          {r.invertidoEnCurso > 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '6px 0 0' }}>
              Invertido en reparaciones que aún no se entregan: <strong>{formatoCOP(r.invertidoEnCurso)}</strong> (se
              descuenta el día que se entreguen).
            </p>
          ) : null}
          {r.costosSinCobro > 0 ? (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', margin: '6px 0 0' }}>
              Incluye {formatoCOP(r.costosSinCobro)} perdidos en reparaciones que no se pudieron hacer o se cancelaron.
            </p>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h2>Reparaciones entregadas</h2>
        {r.reparacionesEntregadas.length === 0 ? (
          <p className="empty-state">Ninguna reparación entregada en el período.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Equipo</th>
                  <th className="num">Cobrado</th>
                  <th className="num">Costos</th>
                  <th className="num">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {r.reparacionesEntregadas.map((x) => (
                  <tr key={x.reparacionId}>
                    <td>
                      <a href={`/reparaciones/${x.reparacionId}`}>#{x.numeroOrden}</a>
                    </td>
                    <td>
                      {x.equipo}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{x.cliente}</small>
                    </td>
                    <td className="num">{formatoCOP(x.ingreso)}</td>
                    <td className="num">
                      {x.costo === 0 ? (
                        <a href={`/reparaciones/${x.reparacionId}#costos`} className="texto-alerta">
                          Sin registrar
                        </a>
                      ) : (
                        formatoCOP(x.costo)
                      )}
                    </td>
                    <td className="num">
                      <strong>{formatoCOP(x.ganancia)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="empty-state">No hay movimientos en el período.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th className="num">Entra</th>
                  <th className="num">Sale</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(m.fecha)}</td>
                    <td>{TIPO_MOV_LABELS[m.tipo]}</td>
                    <td>{m.href ? <a href={m.href}>{m.descripcion}</a> : m.descripcion}</td>
                    <td className="num texto-ok">{m.ingreso ? formatoCOP(m.ingreso) : ''}</td>
                    <td className="num texto-danger">{m.egreso ? formatoCOP(m.egreso) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Inventario hoy</h2>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          {inventario.unidades} unidades en {inventario.referencias} productos · valen{' '}
          <strong>{formatoCOP(inventario.valorCosto)}</strong> a costo y{' '}
          <strong>{formatoCOP(inventario.valorVenta)}</strong> a precio de venta.
          {inventario.bajoStock > 0 ? (
            <>
              {' '}
              <a href="/inventario" className="texto-alerta">
                {inventario.bajoStock} por reponer
              </a>
              .
            </>
          ) : null}
        </p>
      </div>
    </>
  );
}
