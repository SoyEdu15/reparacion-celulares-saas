'use client';

import { useMemo, useState } from 'react';

type ProductoOpcion = {
  id: string;
  nombre: string;
  categoria: 'ACCESORIO' | 'REPUESTO';
  precioVenta: number;
  stock: number;
  codigo: string | null;
};

type Linea = {
  key: number;
  productoId: string; // '' = ítem libre
  tipo: 'ACCESORIO' | 'REPUESTO' | 'REPARACION';
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  costoUnitario: string;
};

function soloDigitos(v: string): string {
  return v.replace(/[^\d]/g, '');
}

function aNumero(v: string): number {
  const n = Number(soloDigitos(v));
  return Number.isFinite(n) ? n : 0;
}

function cop(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function miles(v: string): string {
  const d = soloDigitos(v);
  return d === '' ? '' : Number(d).toLocaleString('es-CO');
}

let siguienteKey = 1;
function lineaVacia(tipo: Linea['tipo'] = 'ACCESORIO'): Linea {
  return {
    key: siguienteKey++,
    productoId: '',
    tipo,
    descripcion: '',
    cantidad: '1',
    precioUnitario: '',
    costoUnitario: '',
  };
}

export function VentaForm({
  productos,
  action,
  hoy,
}: {
  productos: ProductoOpcion[];
  action: (formData: FormData) => void | Promise<void>;
  hoy: string;
}) {
  const [lineas, setLineas] = useState<Linea[]>(() => [lineaVacia()]);
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  function actualizar(key: number, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
  }

  function elegirProducto(key: number, productoId: string) {
    const p = porId.get(productoId);
    if (p) {
      actualizar(key, {
        productoId,
        tipo: p.categoria,
        descripcion: '',
        precioUnitario: miles(String(p.precioVenta)),
        costoUnitario: '',
      });
    } else {
      actualizar(key, { productoId: '', descripcion: '', precioUnitario: '' });
    }
  }

  const total = lineas.reduce((s, l) => s + aNumero(l.cantidad) * aNumero(l.precioUnitario), 0);

  const itemsJson = JSON.stringify(
    lineas.map((l) => ({
      productoId: l.productoId || null,
      tipo: l.tipo,
      descripcion: l.descripcion.trim(),
      cantidad: aNumero(l.cantidad),
      precioUnitario: aNumero(l.precioUnitario),
      costoUnitario: l.productoId ? 0 : aNumero(l.costoUnitario),
    })),
  );

  return (
    <form action={action}>
      <input type="hidden" name="items" value={itemsJson} />

      <div className="venta-lineas">
        {lineas.map((l, idx) => {
          const producto = l.productoId ? porId.get(l.productoId) : undefined;
          const excede = producto != null && aNumero(l.cantidad) > producto.stock;
          return (
            <div key={l.key} className="venta-linea">
              <label className="form-field venta-linea-producto">
                {idx === 0 ? 'Producto' : <span className="sr-only">Producto</span>}
                <select value={l.productoId} onChange={(e) => elegirProducto(l.key, e.target.value)}>
                  <option value="">— Otro / no está en inventario —</option>
                  <optgroup label="Accesorios">
                    {productos
                      .filter((p) => p.categoria === 'ACCESORIO')
                      .map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.nombre} {p.codigo ? `[${p.codigo}]` : ''} — {p.stock} disp.
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Repuestos">
                    {productos
                      .filter((p) => p.categoria === 'REPUESTO')
                      .map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.nombre} {p.codigo ? `[${p.codigo}]` : ''} — {p.stock} disp.
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>

              {!l.productoId ? (
                <>
                  <label className="form-field">
                    {idx === 0 ? 'Tipo' : <span className="sr-only">Tipo</span>}
                    <select
                      value={l.tipo}
                      onChange={(e) => actualizar(l.key, { tipo: e.target.value as Linea['tipo'] })}
                    >
                      <option value="ACCESORIO">Accesorio</option>
                      <option value="REPUESTO">Repuesto</option>
                      <option value="REPARACION">Reparación / servicio</option>
                    </select>
                  </label>
                  <label className="form-field venta-linea-desc">
                    {idx === 0 ? 'Descripción' : <span className="sr-only">Descripción</span>}
                    <input
                      value={l.descripcion}
                      maxLength={200}
                      placeholder="Ej. Cambio de pin de carga"
                      onChange={(e) => actualizar(l.key, { descripcion: e.target.value })}
                      required
                    />
                  </label>
                </>
              ) : null}

              <label className="form-field venta-linea-cant">
                {idx === 0 ? 'Cant.' : <span className="sr-only">Cantidad</span>}
                <input
                  inputMode="numeric"
                  value={l.cantidad}
                  onChange={(e) => actualizar(l.key, { cantidad: soloDigitos(e.target.value) })}
                  required
                  aria-invalid={excede}
                />
              </label>

              <label className="form-field">
                {idx === 0 ? 'Precio unidad' : <span className="sr-only">Precio unidad</span>}
                <div className="input-prefijo">
                  <span className="input-prefijo-tag">$</span>
                  <input
                    inputMode="numeric"
                    value={l.precioUnitario}
                    placeholder="0"
                    onChange={(e) => actualizar(l.key, { precioUnitario: miles(e.target.value) })}
                    required
                  />
                </div>
              </label>

              {!l.productoId ? (
                <label className="form-field" title="Lo que te costó a ti (repuesto, insumos). Sirve para calcular la ganancia.">
                  {idx === 0 ? 'Me costó (opcional)' : <span className="sr-only">Me costó</span>}
                  <div className="input-prefijo">
                    <span className="input-prefijo-tag">$</span>
                    <input
                      inputMode="numeric"
                      value={l.costoUnitario}
                      placeholder="0"
                      onChange={(e) => actualizar(l.key, { costoUnitario: miles(e.target.value) })}
                    />
                  </div>
                </label>
              ) : null}

              <div className="venta-linea-subtotal">
                {cop(aNumero(l.cantidad) * aNumero(l.precioUnitario))}
                {excede ? <small className="texto-danger">Solo hay {producto!.stock}</small> : null}
              </div>

              {lineas.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-secondary venta-linea-quitar"
                  aria-label="Quitar ítem"
                  onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))}
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 20px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
          + Agregar ítem
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setLineas((ls) => [...ls, lineaVacia('REPARACION')])}
        >
          + Reparación rápida (sin orden)
        </button>
      </div>

      <div className="form-grid">
        <label className="form-field">
          Método de pago
          <select name="metodoPago" defaultValue="EFECTIVO">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia / Nequi</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="OTRO">Otro</option>
          </select>
        </label>
        <label className="form-field">
          Cliente (opcional)
          <input name="cliente" maxLength={120} />
        </label>
        <label className="form-field">
          Fecha
          <input type="date" name="fecha" defaultValue={hoy} max={hoy} />
        </label>
        <label className="form-field">
          Nota (opcional)
          <input name="nota" maxLength={200} />
        </label>
      </div>

      <div className="venta-total">
        <span>Total</span>
        <strong>{cop(total)}</strong>
        <button type="submit" className="btn btn-primary" disabled={total <= 0}>
          Registrar venta
        </button>
      </div>
    </form>
  );
}
