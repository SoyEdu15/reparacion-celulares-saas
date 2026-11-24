import { requireDueno } from '@/lib/auth/guards';
import { hoyBogota } from '@/lib/fechas-bogota';
import { CATEGORIA_PRODUCTO_LABELS, formatoCOP, margenPct } from '@/lib/cuentas-labels';
import { listarProductos, resumenInventario } from '@/server/services/inventario';
import { crearProductoAction, registrarEntradaAction } from './actions';

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; q?: string; categoria?: string; inactivos?: string }>;
}) {
  const session = await requireDueno();
  const sp = await searchParams;
  const categoria = sp.categoria === 'ACCESORIO' || sp.categoria === 'REPUESTO' ? sp.categoria : undefined;
  const q = sp.q?.trim() || undefined;

  const [productos, resumen, todosActivos] = await Promise.all([
    listarProductos(session.user.tenantId, { q, categoria, incluirInactivos: sp.inactivos === '1' }),
    resumenInventario(session.user.tenantId),
    listarProductos(session.user.tenantId),
  ]);

  return (
    <>
      <div className="page-header">
        <h1>Inventario</h1>
      </div>

      {sp.error ? <p className="form-error">{sp.error}</p> : null}
      {sp.ok ? <p className="form-success">{sp.ok}</p> : null}

      <div className="kpi-grid">
        <div className="kpi">
          <span>Mercancía a costo</span>
          <strong>{formatoCOP(resumen.valorCosto)}</strong>
          <small>Lo que te costó lo que tienes</small>
        </div>
        <div className="kpi">
          <span>Mercancía a precio de venta</span>
          <strong>{formatoCOP(resumen.valorVenta)}</strong>
          <small>Ganancia potencial {formatoCOP(resumen.valorVenta - resumen.valorCosto)}</small>
        </div>
        <div className="kpi">
          <span>Unidades</span>
          <strong>{resumen.unidades}</strong>
          <small>{resumen.referencias} producto(s)</small>
        </div>
        <div className={`kpi ${resumen.bajoStock > 0 ? 'kpi-alerta' : ''}`}>
          <span>Por reponer</span>
          <strong>{resumen.bajoStock}</strong>
          <small>En o bajo el stock mínimo</small>
        </div>
      </div>

      <details className="card" open={todosActivos.length === 0}>
        <summary className="card-summary">+ Nuevo producto</summary>
        <form action={crearProductoAction} className="form-grid" style={{ marginTop: 16 }}>
          <label className="form-field" style={{ gridColumn: 'span 2' }}>
            Nombre
            <input name="nombre" required maxLength={150} placeholder="Ej. Pantalla Samsung A12 / Cargador tipo C 20W" />
          </label>
          <label className="form-field">
            Categoría
            <select name="categoria" required defaultValue="">
              <option value="" disabled>
                Selecciona
              </option>
              <option value="ACCESORIO">Accesorio</option>
              <option value="REPUESTO">Repuesto</option>
            </select>
          </label>
          <label className="form-field">
            Código / referencia (opcional)
            <input name="codigo" maxLength={60} />
          </label>
          <label className="form-field">
            Precio de compra (unidad)
            <div className="input-prefijo">
              <span className="input-prefijo-tag">$</span>
              <input name="costoUnitario" inputMode="numeric" placeholder="0" />
            </div>
          </label>
          <label className="form-field">
            Precio de venta (unidad)
            <div className="input-prefijo">
              <span className="input-prefijo-tag">$</span>
              <input name="precioVenta" inputMode="numeric" required placeholder="0" />
            </div>
          </label>
          <label className="form-field">
            Cantidad que tienes hoy
            <input name="stockInicial" type="number" min={0} defaultValue={0} />
          </label>
          <label className="form-field">
            Avisar cuando queden
            <input name="stockMinimo" type="number" min={0} defaultValue={1} />
          </label>
          <button type="submit" className="btn btn-primary">
            Crear producto
          </button>
        </form>
      </details>

      {todosActivos.length > 0 ? (
        <details className="card">
          <summary className="card-summary">+ Entrada de mercancía (compra al proveedor)</summary>
          <form action={registrarEntradaAction} className="form-grid" style={{ marginTop: 16 }}>
            <label className="form-field" style={{ gridColumn: 'span 2' }}>
              Producto
              <select name="productoId" required defaultValue="">
                <option value="" disabled>
                  Selecciona
                </option>
                {todosActivos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({CATEGORIA_PRODUCTO_LABELS[p.categoria]}, hay {p.stock})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Cantidad
              <input name="cantidad" type="number" min={1} required />
            </label>
            <label className="form-field">
              Costo por unidad
              <div className="input-prefijo">
                <span className="input-prefijo-tag">$</span>
                <input name="costoUnitario" inputMode="numeric" required placeholder="0" />
              </div>
            </label>
            <label className="form-field">
              Proveedor (opcional)
              <input name="proveedor" maxLength={120} />
            </label>
            <label className="form-field">
              Fecha
              <input type="date" name="fecha" defaultValue={hoyBogota()} max={hoyBogota()} />
            </label>
            <button type="submit" className="btn btn-primary">
              Registrar entrada
            </button>
          </form>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '12px 0 0' }}>
            Si el precio de compra cambia, el sistema promedia el costo de lo que ya tenías con lo nuevo. El transporte para
            traer la mercancía regístralo en Gastos.
          </p>
        </details>
      ) : null}

      <div className="card">
        <form method="get" className="filtros-inline">
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o código" />
          <select name="categoria" defaultValue={categoria ?? ''}>
            <option value="">Todas</option>
            <option value="ACCESORIO">Accesorios</option>
            <option value="REPUESTO">Repuestos</option>
          </select>
          <label style={{ fontSize: '0.8125rem', display: 'flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" name="inactivos" value="1" defaultChecked={sp.inactivos === '1'} /> Ver desactivados
          </label>
          <button type="submit" className="btn btn-secondary">
            Filtrar
          </button>
        </form>

        {productos.length === 0 ? (
          <p className="empty-state">No hay productos{q || categoria ? ' con ese filtro' : ' todavía'}.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Stock</th>
                  <th className="num">Costo</th>
                  <th className="num">Precio</th>
                  <th className="num">Ganancia c/u</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const bajo = p.activo && p.stock <= p.stockMinimo;
                  return (
                    <tr key={p.id} className={p.activo ? '' : 'fila-anulada'}>
                      <td>
                        <a href={`/inventario/${p.id}`}>{p.nombre}</a>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          {CATEGORIA_PRODUCTO_LABELS[p.categoria]}
                          {p.codigo ? ` · ${p.codigo}` : ''}
                          {p.activo ? '' : ' · desactivado'}
                        </small>
                      </td>
                      <td className="num">
                        <span className={bajo ? 'badge badge-danger' : ''}>{p.stock}</span>
                      </td>
                      <td className="num">{formatoCOP(p.costoPromedio)}</td>
                      <td className="num">{formatoCOP(p.precioVenta)}</td>
                      <td className="num">
                        {formatoCOP(p.precioVenta - p.costoPromedio)}
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          {margenPct(p.precioVenta, p.precioVenta - p.costoPromedio)}
                        </small>
                      </td>
                      <td>
                        <a className="btn btn-secondary btn-sm" href={`/inventario/${p.id}`}>
                          Ver
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
