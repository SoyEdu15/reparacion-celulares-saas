import { requireSession } from '@/lib/auth/guards';
import { hoyBogota, rangoPeriodo } from '@/lib/fechas-bogota';
import { formatoCOP, METODO_PAGO_LABELS, TIPO_PAGO_REPARACION_LABELS, TIPO_VENTA_LABELS } from '@/lib/cuentas-labels';
import { listarProductos } from '@/server/services/inventario';
import { listarVentas } from '@/server/services/ventas';
import { listarPagosReparacion } from '@/server/services/pagos-reparacion';
import { VentaForm } from '@/components/tenant/venta-form';
import { PeriodoFiltro } from '@/components/tenant/periodo-filtro';
import { anularVentaAction, registrarVentaAction } from './actions';

function fechaHora(fecha: Date) {
  const f = new Date(fecha);
  return (
    <>
      {f.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit' })}
      <br />
      <small style={{ color: 'var(--text-muted)' }}>
        {f.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', timeStyle: 'short' })}
      </small>
    </>
  );
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; periodo?: string; desde?: string; hasta?: string }>;
}) {
  const session = await requireSession();
  const esDueno = session.user.rol === 'DUENO';
  const sp = await searchParams;
  const rango = rangoPeriodo(sp.periodo, sp.desde, sp.hasta);

  const [productos, ventas, pagos] = await Promise.all([
    listarProductos(session.user.tenantId),
    listarVentas(session.user.tenantId, rango.desde, rango.hasta),
    listarPagosReparacion(session.user.tenantId, rango.desde, rango.hasta),
  ]);
  const totalPagos = pagos.reduce((s, p) => s + (p.tipo === 'DEVOLUCION' ? -p.monto : p.monto), 0);

  const activas = ventas.filter((v) => !v.anulada);
  const totalPeriodo = activas.reduce((s, v) => s + v.total, 0);
  const costoPeriodo = activas.reduce((s, v) => s + v.costoTotal, 0);
  const volver = `/ventas?periodo=${rango.periodo}${rango.periodo === 'rango' ? `&desde=${rango.desdeDia}&hasta=${rango.hastaDia}` : ''}`;

  return (
    <>
      <div className="page-header">
        <h1>Ventas</h1>
        {esDueno ? (
          <a className="btn btn-secondary" href="/cuentas">
            Ver cuentas del local →
          </a>
        ) : null}
      </div>

      {sp.error ? <p className="form-error">{sp.error}</p> : null}
      {sp.ok ? <p className="form-success">Venta registrada.</p> : null}

      <div className="card">
        <h2>Nueva venta</h2>
        {productos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 0 }}>
            Todavía no hay productos en el inventario. Puedes registrar ítems libres, o{' '}
            {esDueno ? <a href="/inventario">cargar productos al inventario</a> : 'pedirle al dueño que cargue el inventario'}.
          </p>
        ) : null}
        <VentaForm
          key={sp.ok ?? 'nueva'}
          action={registrarVentaAction}
          hoy={hoyBogota()}
          productos={productos.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            categoria: p.categoria,
            precioVenta: p.precioVenta,
            stock: p.stock,
            codigo: p.codigo,
          }))}
        />
      </div>

      <div className="card">
        <div className="card-header-row">
          <h2 style={{ margin: 0 }}>Ventas registradas</h2>
          <div className="totales-inline">
            <span>
              Vendido: <strong>{formatoCOP(totalPeriodo)}</strong>
            </span>
            {esDueno ? (
              <span>
                Ganancia: <strong className="texto-ok">{formatoCOP(totalPeriodo - costoPeriodo)}</strong>
              </span>
            ) : null}
          </div>
        </div>
        <PeriodoFiltro base="/ventas" periodo={rango.periodo} desdeDia={rango.desdeDia} hastaDia={rango.hastaDia} />

        {ventas.length === 0 ? (
          <p className="empty-state">No hay ventas en este período.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Detalle</th>
                  <th>Pago</th>
                  <th className="num">Total</th>
                  {esDueno ? <th className="num">Ganancia</th> : null}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className={v.anulada ? 'fila-anulada' : ''}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(v.fecha)}</td>
                    <td>
                      {v.items.map((i) => (
                        <div key={i.id}>
                          {i.cantidad} × {i.descripcion}{' '}
                          <span className="badge badge-inactivo">{TIPO_VENTA_LABELS[i.tipo]}</span>
                        </div>
                      ))}
                      <small style={{ color: 'var(--text-muted)' }}>
                        {v.cliente ? `${v.cliente} · ` : ''}
                        {v.registradoPor.nombre}
                        {v.nota ? ` · ${v.nota}` : ''}
                        {v.anulada ? ' · ANULADA' : ''}
                      </small>
                    </td>
                    <td>{METODO_PAGO_LABELS[v.metodoPago]}</td>
                    <td className="num">{formatoCOP(v.total)}</td>
                    {esDueno ? <td className="num">{formatoCOP(v.total - v.costoTotal)}</td> : null}
                    <td>
                      {esDueno && !v.anulada ? (
                        <form action={anularVentaAction}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="volver" value={volver} />
                          <button type="submit" className="btn btn-danger btn-sm">
                            Anular
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header-row">
          <h2 style={{ margin: 0 }}>Pagos de reparaciones</h2>
          <div className="totales-inline">
            <span>
              Entró: <strong>{formatoCOP(totalPagos)}</strong>
            </span>
            <span>
              Total en caja: <strong className="texto-ok">{formatoCOP(totalPeriodo + totalPagos)}</strong>
            </span>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 0 }}>
          Abonos que dejan los clientes y lo que pagan al recoger el equipo, en el mismo período. Se registran desde
          cada orden.
        </p>
        {pagos.length === 0 ? (
          <p className="empty-state">No hay pagos de reparaciones en este período.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Orden</th>
                  <th>Tipo</th>
                  <th>Pago</th>
                  <th className="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(p.fecha)}</td>
                    <td>
                      <a href={`/reparaciones/${p.reparacion.id}`}>
                        #{p.reparacion.numeroOrden} — {p.reparacion.equipo.marca} {p.reparacion.equipo.modelo}
                      </a>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>
                        {p.reparacion.cliente.nombre} · {p.registradoPor.nombre}
                        {p.nota ? ` · ${p.nota}` : ''}
                      </small>
                    </td>
                    <td>{TIPO_PAGO_REPARACION_LABELS[p.tipo]}</td>
                    <td>{METODO_PAGO_LABELS[p.metodoPago]}</td>
                    <td className={`num ${p.tipo === 'DEVOLUCION' ? 'texto-danger' : ''}`}>
                      {p.tipo === 'DEVOLUCION' ? '−' : ''}
                      {formatoCOP(p.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
