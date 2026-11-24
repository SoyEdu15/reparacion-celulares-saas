import type { CategoriaGasto, MetodoPago, TipoVenta } from '@prisma/client';
import { withTenant } from '@/lib/rls';
import { METODO_PAGO_LABELS, TIPO_PAGO_REPARACION_LABELS } from '@/lib/cuentas-labels';
import { netoPagado } from './pagos-reparacion';

export type LineaCategoria = { tipo: TipoVenta; ingreso: number; costo: number; ganancia: number; cantidad: number };

export type Movimiento = {
  fecha: Date;
  tipo: 'VENTA' | 'PAGO_REPARACION' | 'GASTO' | 'COSTO_REPARACION' | 'COMPRA';
  descripcion: string;
  ingreso: number;
  egreso: number;
  href?: string;
};

/**
 * Cuentas del local para un rango [desde, hasta).
 *
 * Cómo se arma la utilidad:
 *   ingresos = ventas de mostrador (no anuladas) + facturas de reparaciones
 *              entregadas en el período
 *   − costo de la mercancía vendida (snapshot del costo de cada ítem)
 *   − costos de las reparaciones entregadas en el período (repuestos,
 *     transporte, insumos), o cerradas sin cobro (no reparable/cancelada)
 *   − gastos generales del período
 *
 * Abonos: cuentan para la CAJA el día que se reciben (pagos_reparacion),
 * pero la ganancia de la reparación se reconoce completa el día de la
 * entrega. Si la orden se cierra sin reparar y el abono no se devuelve, lo
 * que quedó es ingreso del día del cierre.
 *
 * Las compras de mercancía (entradas de inventario) NO restan de la
 * utilidad: esa plata se convierte en inventario y se descuenta cuando el
 * producto se vende. Se muestran aparte como salida de caja.
 */
export async function resumenCuentas(tenantId: string, desde: Date, hasta: Date) {
  const rango = { gte: desde, lt: hasta };

  const [items, ventasPorMetodo, facturas, costosRep, gastos, entradas, cerradasSinCobro, enCurso, pagos] = await withTenant(tenantId, (tx) =>
    Promise.all([
      tx.ventaItem.findMany({
        where: { venta: { anulada: false, fecha: rango } },
        select: { tipo: true, cantidad: true, precioUnitario: true, costoUnitario: true },
      }),
      tx.venta.groupBy({
        by: ['metodoPago'],
        where: { anulada: false, fecha: rango },
        _sum: { total: true },
        _count: { _all: true },
      }),
      tx.factura.findMany({
        where: { createdAt: rango },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          numeroFactura: true,
          total: true,
          createdAt: true,
          reparacion: {
            select: {
              id: true,
              numeroOrden: true,
              cliente: { select: { nombre: true } },
              equipo: { select: { marca: true, modelo: true } },
              costos: { select: { monto: true } },
            },
          },
        },
      }),
      tx.costoReparacion.findMany({
        where: { fecha: rango },
        orderBy: { fecha: 'desc' },
        select: {
          id: true,
          fecha: true,
          descripcion: true,
          monto: true,
          reparacion: { select: { id: true, numeroOrden: true } },
        },
      }),
      tx.gasto.findMany({ where: { fecha: rango }, orderBy: { fecha: 'desc' } }),
      tx.entradaInventario.findMany({
        where: { fecha: rango },
        orderBy: { fecha: 'desc' },
        include: { producto: { select: { id: true, nombre: true } } },
      }),
      // Reparaciones que terminaron sin cobro (no reparable / cancelada) en
      // el período: lo que se gastó en ellas es pérdida de ese día.
      tx.historialEstado.findMany({
        where: { estadoNuevo: { in: ['NO_REPARABLE', 'CANCELADO'] }, createdAt: rango },
        select: {
          reparacion: {
            select: { id: true, costos: { select: { monto: true } }, pagos: { select: { tipo: true, monto: true } } },
          },
        },
      }),
      // Plata metida en reparaciones que todavía no se entregan.
      tx.costoReparacion.aggregate({
        where: { reparacion: { estado: { notIn: ['ENTREGADO', 'NO_REPARABLE', 'CANCELADO'] } } },
        _sum: { monto: true },
      }),
      tx.pagoReparacion.findMany({
        where: { fecha: rango },
        orderBy: { fecha: 'desc' },
        select: {
          tipo: true,
          monto: true,
          metodoPago: true,
          fecha: true,
          reparacion: {
            select: { id: true, numeroOrden: true, estado: true, equipo: { select: { marca: true, modelo: true } } },
          },
        },
      }),
    ]),
  );

  // --- Por categoría -------------------------------------------------------
  const porTipo = new Map<TipoVenta, LineaCategoria>();
  for (const tipo of ['ACCESORIO', 'REPUESTO', 'REPARACION'] as TipoVenta[]) {
    porTipo.set(tipo, { tipo, ingreso: 0, costo: 0, ganancia: 0, cantidad: 0 });
  }
  for (const i of items) {
    const l = porTipo.get(i.tipo)!;
    l.ingreso += i.cantidad * i.precioUnitario;
    l.costo += i.cantidad * i.costoUnitario;
    l.cantidad += i.cantidad;
  }
  const rep = porTipo.get('REPARACION')!;
  const ingresoFacturas = facturas.reduce((s, f) => s + f.total, 0);
  // Los costos de una reparación con orden se reconocen cuando se entrega y
  // se cobra (mismo día que su ingreso), no cuando se compró el repuesto: así
  // la ganancia de cada día corresponde a lo que realmente se cerró ese día.
  const costosEntregadas = facturas.reduce((s, f) => s + f.reparacion.costos.reduce((a, c) => a + c.monto, 0), 0);
  const vistas = new Set<string>();
  let costosSinCobro = 0;
  let abonosRetenidos = 0;
  let cerradasConAbono = 0;
  for (const h of cerradasSinCobro) {
    if (vistas.has(h.reparacion.id)) continue;
    vistas.add(h.reparacion.id);
    costosSinCobro += h.reparacion.costos.reduce((a, c) => a + c.monto, 0);
    const retenido = netoPagado(h.reparacion.pagos);
    if (retenido > 0) {
      abonosRetenidos += retenido;
      cerradasConAbono += 1;
    }
  }
  const totalCostosRep = costosEntregadas + costosSinCobro;
  rep.ingreso += ingresoFacturas + abonosRetenidos;
  rep.cantidad += facturas.length + cerradasConAbono;
  rep.costo += totalCostosRep;
  for (const l of porTipo.values()) l.ganancia = l.ingreso - l.costo;
  const categorias = [...porTipo.values()];

  // --- Gastos ---------------------------------------------------------------
  const gastosPorCategoria = new Map<CategoriaGasto, number>();
  for (const g of gastos) gastosPorCategoria.set(g.categoria, (gastosPorCategoria.get(g.categoria) ?? 0) + g.monto);
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  const ingresos = categorias.reduce((s, l) => s + l.ingreso, 0);
  const costos = categorias.reduce((s, l) => s + l.costo, 0);
  const gananciaBruta = ingresos - costos;
  const utilidadNeta = gananciaBruta - totalGastos;
  const comprasMercancia = entradas.reduce((s, e) => s + e.cantidad * e.costoUnitario, 0);

  // --- Caja: plata que entró de verdad, por método de pago -----------------
  // Ventas de mostrador + abonos y pagos de reparaciones − devoluciones.
  const porMetodo = new Map<MetodoPago, { metodo: MetodoPago; total: number; cantidad: number }>();
  const sumar = (metodo: MetodoPago, monto: number, n: number) => {
    const m = porMetodo.get(metodo) ?? { metodo, total: 0, cantidad: 0 };
    m.total += monto;
    m.cantidad += n;
    porMetodo.set(metodo, m);
  };
  for (const v of ventasPorMetodo) sumar(v.metodoPago as MetodoPago, v._sum.total ?? 0, v._count._all);
  for (const p of pagos) sumar(p.metodoPago, p.tipo === 'DEVOLUCION' ? -p.monto : p.monto, 1);
  const metodos = [...porMetodo.values()].sort((a, b) => b.total - a.total);
  const ventasMostrador = ventasPorMetodo.reduce((s, v) => s + (v._sum.total ?? 0), 0);
  const sumaTipo = (t: string) => pagos.filter((p) => p.tipo === t).reduce((s, p) => s + p.monto, 0);
  const caja = {
    ventasMostrador,
    abonos: sumaTipo('ABONO'),
    saldos: sumaTipo('SALDO'),
    devoluciones: sumaTipo('DEVOLUCION'),
    // Abonos recibidos en el período de órdenes que siguen abiertas: es plata
    // que ya está en caja pero todavía no es ganancia.
    abonosOrdenesAbiertas: pagos
      .filter((p) => p.tipo === 'ABONO' && !['ENTREGADO', 'NO_REPARABLE', 'CANCELADO'].includes(p.reparacion.estado))
      .reduce((s, p) => s + p.monto, 0),
    total: 0,
  };
  caja.total = caja.ventasMostrador + caja.abonos + caja.saldos - caja.devoluciones;

  // --- Reparaciones entregadas: ganancia real por orden ---------------------
  const reparacionesEntregadas = facturas.map((f) => {
    const costo = f.reparacion.costos.reduce((s, c) => s + c.monto, 0);
    return {
      reparacionId: f.reparacion.id,
      numeroOrden: f.reparacion.numeroOrden,
      numeroFactura: f.numeroFactura,
      cliente: f.reparacion.cliente.nombre,
      equipo: `${f.reparacion.equipo.marca} ${f.reparacion.equipo.modelo}`,
      ingreso: f.total,
      costo,
      ganancia: f.total - costo,
      fecha: f.createdAt,
    };
  });

  // --- Movimientos (línea de tiempo) ---------------------------------------
  const movimientos: Movimiento[] = [
    ...pagos.map((p) => ({
      fecha: p.fecha,
      tipo: 'PAGO_REPARACION' as const,
      descripcion: `${TIPO_PAGO_REPARACION_LABELS[p.tipo]} orden #${p.reparacion.numeroOrden} — ${p.reparacion.equipo.marca} ${p.reparacion.equipo.modelo} (${METODO_PAGO_LABELS[p.metodoPago]})`,
      ingreso: p.tipo === 'DEVOLUCION' ? 0 : p.monto,
      egreso: p.tipo === 'DEVOLUCION' ? p.monto : 0,
      href: `/reparaciones/${p.reparacion.id}`,
    })),
    ...costosRep.map((c) => ({
      fecha: c.fecha,
      tipo: 'COSTO_REPARACION' as const,
      descripcion: `Orden #${c.reparacion.numeroOrden}: ${c.descripcion}`,
      ingreso: 0,
      egreso: c.monto,
      href: `/reparaciones/${c.reparacion.id}`,
    })),
    ...gastos.map((g) => ({
      fecha: g.fecha,
      tipo: 'GASTO' as const,
      descripcion: g.descripcion,
      ingreso: 0,
      egreso: g.monto,
    })),
    ...entradas.map((e) => ({
      fecha: e.fecha,
      tipo: 'COMPRA' as const,
      descripcion: `Compra: ${e.cantidad} × ${e.producto.nombre}${e.proveedor ? ` (${e.proveedor})` : ''}`,
      ingreso: 0,
      egreso: e.cantidad * e.costoUnitario,
      href: `/inventario/${e.producto.id}`,
    })),
  ];

  return {
    categorias,
    ingresos,
    costos,
    gananciaBruta,
    totalGastos,
    utilidadNeta,
    comprasMercancia,
    costosSinCobro,
    abonosRetenidos,
    caja,
    invertidoEnCurso: enCurso._sum.monto ?? 0,
    gastosPorCategoria: [...gastosPorCategoria.entries()].map(([categoria, monto]) => ({ categoria, monto })),
    metodos,
    reparacionesEntregadas,
    movimientos,
  };
}
