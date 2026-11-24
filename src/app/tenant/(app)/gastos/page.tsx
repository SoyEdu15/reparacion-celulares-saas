import { requireDueno } from '@/lib/auth/guards';
import { hoyBogota, rangoPeriodo } from '@/lib/fechas-bogota';
import { CATEGORIA_GASTO_LABELS, formatoCOP } from '@/lib/cuentas-labels';
import { listarGastos } from '@/server/services/gastos';
import { PeriodoFiltro } from '@/components/tenant/periodo-filtro';
import { eliminarGastoAction, registrarGastoAction } from './actions';

function fecha(f: Date): string {
  return new Date(f).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium' });
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; periodo?: string; desde?: string; hasta?: string }>;
}) {
  const session = await requireDueno();
  const sp = await searchParams;
  const rango = rangoPeriodo(sp.periodo ?? 'mes', sp.desde, sp.hasta);
  const gastos = await listarGastos(session.user.tenantId, rango.desde, rango.hasta);
  const total = gastos.reduce((s, g) => s + g.monto, 0);
  const volver = `/gastos?periodo=${rango.periodo}${rango.periodo === 'rango' ? `&desde=${rango.desdeDia}&hasta=${rango.hastaDia}` : ''}`;

  return (
    <>
      <div className="page-header">
        <h1>Gastos del local</h1>
      </div>

      {sp.error ? <p className="form-error">{sp.error}</p> : null}
      {sp.ok ? <p className="form-success">Gasto registrado.</p> : null}

      <div className="card">
        <h2>Nuevo gasto</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 0 }}>
          Gastos generales: arriendo, luz, transporte para traer mercancía, insumos (alcohol, B-7000, estaño)… Lo que gastes
          en una reparación puntual (la pantalla de un cliente) regístralo dentro de esa orden.
        </p>
        <form action={registrarGastoAction} className="form-grid">
          <label className="form-field">
            Categoría
            <select name="categoria" required defaultValue="">
              <option value="" disabled>
                Selecciona
              </option>
              {Object.entries(CATEGORIA_GASTO_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field" style={{ gridColumn: 'span 2' }}>
            Descripción
            <input name="descripcion" required maxLength={200} placeholder="Ej. Pasaje al centro por repuestos" />
          </label>
          <label className="form-field">
            Monto
            <div className="input-prefijo">
              <span className="input-prefijo-tag">$</span>
              <input name="monto" inputMode="numeric" required placeholder="0" />
            </div>
          </label>
          <label className="form-field">
            Fecha
            <input type="date" name="fecha" defaultValue={hoyBogota()} max={hoyBogota()} />
          </label>
          <button type="submit" className="btn btn-primary">
            Registrar gasto
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header-row">
          <h2 style={{ margin: 0 }}>Gastos registrados</h2>
          <div className="totales-inline">
            <span>
              Total: <strong className="texto-danger">{formatoCOP(total)}</strong>
            </span>
          </div>
        </div>
        <PeriodoFiltro base="/gastos" periodo={rango.periodo} desdeDia={rango.desdeDia} hastaDia={rango.hastaDia} />
        {gastos.length === 0 ? (
          <p className="empty-state">No hay gastos en este período.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th className="num">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fecha(g.fecha)}</td>
                    <td>{CATEGORIA_GASTO_LABELS[g.categoria]}</td>
                    <td>
                      {g.descripcion}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{g.registradoPor.nombre}</small>
                    </td>
                    <td className="num">{formatoCOP(g.monto)}</td>
                    <td>
                      <form action={eliminarGastoAction}>
                        <input type="hidden" name="id" value={g.id} />
                        <input type="hidden" name="volver" value={volver} />
                        <button type="submit" className="btn btn-danger btn-sm">
                          Eliminar
                        </button>
                      </form>
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
