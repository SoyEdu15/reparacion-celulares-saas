export const TIPO_VENTA_LABELS: Record<string, string> = {
  ACCESORIO: 'Accesorios',
  REPUESTO: 'Repuestos',
  REPARACION: 'Reparación',
};

export const CATEGORIA_PRODUCTO_LABELS: Record<string, string> = {
  ACCESORIO: 'Accesorio',
  REPUESTO: 'Repuesto',
};

export const METODO_PAGO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia / Nequi',
  TARJETA: 'Tarjeta',
  OTRO: 'Otro',
};

export const CATEGORIA_GASTO_LABELS: Record<string, string> = {
  TRANSPORTE: 'Transporte',
  INSUMOS: 'Insumos',
  ARRIENDO: 'Arriendo',
  SERVICIOS: 'Servicios (luz, agua, internet)',
  NOMINA: 'Nómina / pagos',
  OTRO: 'Otro',
};

export const TIPO_COSTO_REPARACION_LABELS: Record<string, string> = {
  REPUESTO: 'Repuesto',
  TRANSPORTE: 'Transporte',
  INSUMOS: 'Insumos',
  MANO_OBRA_EXTERNA: 'Mano de obra externa',
  OTRO: 'Otro',
};

export function formatoCOP(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export function margenPct(ingreso: number, ganancia: number): string {
  if (ingreso <= 0) return '—';
  return `${Math.round((ganancia / ingreso) * 100)}%`;
}
