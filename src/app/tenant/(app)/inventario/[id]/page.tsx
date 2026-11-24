import { notFound } from 'next/navigation';
import { requireDueno } from '@/lib/auth/guards';
import { hoyBogota } from '@/lib/fechas-bogota';
import { CATEGORIA_PRODUCTO_LABELS, formatoCOP, margenPct } from '@/lib/cuentas-labels';
import { obtenerProducto } from '@/server/services/inventario';
import {
  ajustarStockAction,
  editarProductoAction,
  registrarEntradaAction,
  toggleActivoProductoAction,
} from '../actions';

function fecha(f: Date): string {
  return new Date(f).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium' });
}

export default async function ProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireDueno();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const producto = await obtenerProducto(session.user.tenantId, id);
  if (!producto) notFound();

  const gananciaUnidad = producto.precioVenta - producto.costoPromedio;

  return (
    <>
      <div className="page-header">
        <h1>{producto.nombre}</h1>
        <a className="btn btn-secondary" href="/inventario">
          ← Inventario
        </a>
      </div>

      {sp.error ? <p className="form-error">{sp.error}</p> : null}
      {sp.ok ? <p className="form-success">{sp.ok}</p> : null}

      <div className="kpi-grid">
        <div className={`kpi ${producto.stock <= producto.stockMinimo ? 'kpi-alerta' : ''}`}>
          <span>Stock</span>
          <strong>{producto.stock}</strong>
          <small>Mínimo {producto.stockMinimo}</small>
        </div>
        <div className="kpi">
          <span>Costo promedio</span>
          <strong>{formatoCOP(producto.costoPromedio)}</strong>
        </div>
        <div className="kpi">
          <span>Precio de venta</span>
          <strong>{formatoCOP(producto.precioVenta)}</strong>
        </div>
        <div className="kpi">
          <span>Ganancia por unidad</span>
          <strong className={gananciaUnidad >= 0 ? 'texto-ok' : 'texto-danger'}>{formatoCOP(gananciaUnidad)}</strong>
          <small>{margenPct(producto.precioVenta, gananciaUnidad)} del precio</small>
        </div>
      </div>

      <div className="card">
        <h2>Entrada de mercancía</h2>
        <form action={registrarEntradaAction} className="form-grid">
          <input type="hidden" name="productoId" value={producto.id} />
          <input type="hidden" name="volver" value="detalle" />
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
      </div>

      <div className="card">
        <h2>Editar producto</h2>
        <form action={editarProductoAction} className="form-grid">
          <input type="hidden" name="id" value={producto.id} />
          <label className="form-field" style={{ gridColumn: 'span 2' }}>
            Nombre
            <input name="nombre" required maxLength={150} defaultValue={producto.nombre} />
          </label>
          <label className="form-field">
            Categoría
            <select name="categoria" defaultValue={producto.categoria}>
              <option value="ACCESORIO">Accesorio</option>
              <option value="REPUESTO">Repuesto</option>
            </select>
          </label>
          <label className="form-field">
            Código
            <input name="codigo" maxLength={60} defaultValue={producto.codigo ?? ''} />
          </label>
          <label className="form-field">
            Costo por unidad
            <div className="input-prefijo">
              <span className="input-prefijo-tag">$</span>
              <input name="costoPromedio" inputMode="numeric" required defaultValue={producto.costoPromedio} />
            </div>
          </label>
          <label className="form-field">
            Precio de venta
            <div className="input-prefijo">
              <span className="input-prefijo-tag">$</span>
              <input name="precioVenta" inputMode="numeric" required defaultValue={producto.precioVenta} />
            </div>
          </label>
          <label className="form-field">
            Stock mínimo
            <input name="stockMinimo" type="number" min={0} defaultValue={producto.stockMinimo} />
          </label>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Ajustar por conteo físico</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 0 }}>
          Si contaste y hay una cantidad distinta (algo se dañó o se perdió), pon aquí lo que realmente hay. Lo que falte se
          registra como gasto a su costo.
        </p>
        <form action={ajustarStockAction} className="form-grid">
          <input type="hidden" name="productoId" value={producto.id} />
          <label className="form-field">
            Cantidad real
            <input name="stockReal" type="number" min={0} required defaultValue={producto.stock} />
          </label>
          <label className="form-field" style={{ gridColumn: 'span 2' }}>
            Motivo (opcional)
            <input name="nota" maxLength={200} placeholder="Ej. llegó dañado" />
          </label>
          <button type="submit" className="btn btn-secondary">
            Ajustar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Historial de compras</h2>
        {producto.entradas.length === 0 ? (
          <p className="empty-state">Sin entradas registradas.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">Cant.</th>
                  <th className="num">Costo c/u</th>
                  <th className="num">Total</th>
                  <th>Proveedor / nota</th>
                </tr>
              </thead>
              <tbody>
                {producto.entradas.map((e) => (
                  <tr key={e.id}>
                    <td>{fecha(e.fecha)}</td>
                    <td className="num">{e.cantidad}</td>
                    <td className="num">{formatoCOP(e.costoUnitario)}</td>
                    <td className="num">{formatoCOP(e.cantidad * e.costoUnitario)}</td>
                    <td>
                      {[e.proveedor, e.nota].filter(Boolean).join(' · ') || '—'}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{e.registradoPor.nombre}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form action={toggleActivoProductoAction}>
        <input type="hidden" name="id" value={producto.id} />
        <input type="hidden" name="activo" value={(!producto.activo).toString()} />
        <button type="submit" className={producto.activo ? 'btn btn-danger' : 'btn btn-secondary'}>
          {producto.activo ? 'Desactivar producto (ya no se vende)' : 'Volver a activar'}
        </button>
        <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {CATEGORIA_PRODUCTO_LABELS[producto.categoria]}
        </span>
      </form>
    </>
  );
}
