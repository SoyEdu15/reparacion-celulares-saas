import { z } from 'zod';

/** Montos en COP: acepta "35.000", "35000" o "$35.000" del formulario. */
const pesos = z.preprocess((v) => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return v;
  const limpio = v.replace(/[^\d]/g, '');
  return limpio === '' ? undefined : Number(limpio);
}, z.number({ message: 'Monto inválido' }).int().min(0, 'El monto no puede ser negativo').max(1_000_000_000));

const entero = (min: number, mensaje: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
    z.number({ message: mensaje }).int(mensaje).min(min, mensaje).max(1_000_000),
  );

const textoOpcional = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

const dia = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
);

export const productoSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(150),
  categoria: z.enum(['ACCESORIO', 'REPUESTO'], { message: 'Elige la categoría' }),
  codigo: textoOpcional(60),
  precioVenta: pesos,
  stockMinimo: entero(0, 'Stock mínimo inválido').default(0),
});

export const crearProductoSchema = productoSchema.extend({
  stockInicial: entero(0, 'Cantidad inválida').default(0),
  costoUnitario: pesos.default(0),
});

export const editarProductoSchema = productoSchema.extend({
  id: z.string().uuid(),
  costoPromedio: pesos,
});

export const entradaSchema = z.object({
  productoId: z.string().uuid('Elige un producto'),
  cantidad: entero(1, 'La cantidad debe ser al menos 1'),
  costoUnitario: pesos,
  proveedor: textoOpcional(120),
  nota: textoOpcional(200),
  fecha: dia,
});

export const ajusteStockSchema = z.object({
  productoId: z.string().uuid(),
  stockReal: entero(0, 'Stock inválido'),
  nota: textoOpcional(200),
});

export const itemVentaSchema = z.object({
  productoId: z.string().uuid().nullable(),
  tipo: z.enum(['ACCESORIO', 'REPUESTO', 'REPARACION']),
  descripcion: z.string().trim().max(200),
  cantidad: z.number().int().min(1, 'Cantidad inválida').max(10_000),
  precioUnitario: z.number().int().min(0).max(1_000_000_000),
  costoUnitario: z.number().int().min(0).max(1_000_000_000).default(0),
});

export const ventaSchema = z.object({
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']),
  cliente: textoOpcional(120),
  nota: textoOpcional(200),
  fecha: dia,
  items: z.array(itemVentaSchema).min(1, 'Agrega al menos un ítem').max(50),
});

export const gastoSchema = z.object({
  categoria: z.enum(['TRANSPORTE', 'INSUMOS', 'ARRIENDO', 'SERVICIOS', 'NOMINA', 'OTRO'], {
    message: 'Elige la categoría',
  }),
  descripcion: z.string().trim().min(2, 'Describe el gasto').max(200),
  monto: pesos.refine((n) => n > 0, 'El monto debe ser mayor a 0'),
  fecha: dia,
});

export const costoReparacionSchema = z
  .object({
    reparacionId: z.string().uuid(),
    tipo: z.enum(['REPUESTO', 'TRANSPORTE', 'INSUMOS', 'MANO_OBRA_EXTERNA', 'OTRO']),
    productoId: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable()).default(null),
    descripcion: textoOpcional(200),
    cantidad: entero(1, 'Cantidad inválida').default(1),
    monto: pesos.optional(),
  })
  // Elegir un repuesto del inventario y a la vez escribir un costo o un tipo
  // distinto a "Repuesto" es ambiguo: antes se descontaba el repuesto y se
  // ignoraba lo escrito. Mejor rechazarlo y que quede claro qué se registra.
  .refine((d) => d.productoId == null || d.tipo === 'REPUESTO', {
    message: 'Elegiste un repuesto del inventario pero el tipo no es "Repuesto". Para transporte o insumos deja "Del inventario" en "No".',
    path: ['productoId'],
  })
  .refine((d) => d.productoId == null || d.monto == null || d.monto === 0, {
    message: 'Si el repuesto sale del inventario su costo se toma solo: deja el campo "Costo" vacío.',
    path: ['monto'],
  })
  .refine((d) => d.productoId != null || (d.monto != null && d.monto > 0), {
    message: 'Indica cuánto costó (o elige un repuesto del inventario)',
    path: ['monto'],
  })
  .refine((d) => d.productoId != null || (d.descripcion != null && d.descripcion.length >= 2), {
    message: 'Describe el costo (ej. "Pantalla comprada en el centro")',
    path: ['descripcion'],
  });

const metodoPago = z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'], { message: 'Elige cómo pagó' });

/** Abono del cliente a una orden, o devolución si la orden se cerró sin repararse. */
export const pagoReparacionSchema = z.object({
  reparacionId: z.string().uuid(),
  monto: pesos.refine((v) => v > 0, 'Escribe el monto'),
  metodoPago,
  nota: textoOpcional(200),
});

export const metodoPagoSchema = metodoPago;
