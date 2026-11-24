'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno } from '@/lib/auth/guards';
import {
  ajusteStockSchema,
  crearProductoSchema,
  editarProductoSchema,
  entradaSchema,
} from '@/lib/validation/cuentas';
import { fechaMovimiento } from '@/lib/fechas-bogota';
import {
  ajustarStock,
  crearProducto,
  editarProducto,
  ErrorInventario,
  registrarEntrada,
  toggleActivoProducto,
} from '@/server/services/inventario';

function campos(formData: FormData, nombres: string[]) {
  return Object.fromEntries(nombres.map((n) => [n, formData.get(n) ?? undefined]));
}

function volverCon(ruta: string, param: 'error' | 'ok', valor: string): never {
  const sep = ruta.includes('?') ? '&' : '?';
  redirect(`${ruta}${sep}${param}=${encodeURIComponent(valor)}`);
}

export async function crearProductoAction(formData: FormData) {
  const session = await requireDueno();
  const parsed = crearProductoSchema.safeParse(
    campos(formData, ['nombre', 'categoria', 'codigo', 'precioVenta', 'stockMinimo', 'stockInicial', 'costoUnitario']),
  );
  if (!parsed.success) volverCon('/inventario', 'error', parsed.error.issues[0]?.message ?? 'Datos inválidos');

  await crearProducto(session.user.tenantId, session.user.id, parsed.data);
  revalidatePath('/inventario');
  volverCon('/inventario', 'ok', `Producto "${parsed.data.nombre}" creado`);
}

export async function editarProductoAction(formData: FormData) {
  const session = await requireDueno();
  const parsed = editarProductoSchema.safeParse(
    campos(formData, ['id', 'nombre', 'categoria', 'codigo', 'precioVenta', 'stockMinimo', 'costoPromedio']),
  );
  const id = String(formData.get('id') ?? '');
  if (!parsed.success) volverCon(`/inventario/${id}`, 'error', parsed.error.issues[0]?.message ?? 'Datos inválidos');

  await editarProducto(session.user.tenantId, parsed.data);
  revalidatePath('/inventario');
  volverCon(`/inventario/${id}`, 'ok', 'Cambios guardados');
}

export async function registrarEntradaAction(formData: FormData) {
  const session = await requireDueno();
  const volver = String(formData.get('volver') ?? '/inventario') === 'detalle'
    ? `/inventario/${String(formData.get('productoId') ?? '')}`
    : '/inventario';
  const parsed = entradaSchema.safeParse(
    campos(formData, ['productoId', 'cantidad', 'costoUnitario', 'proveedor', 'nota', 'fecha']),
  );
  if (!parsed.success) volverCon(volver, 'error', parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const { fecha, ...data } = parsed.data;
  try {
    await registrarEntrada(session.user.tenantId, session.user.id, { ...data, fecha: fechaMovimiento(fecha) });
  } catch (error) {
    if (error instanceof ErrorInventario) volverCon(volver, 'error', error.message);
    throw error;
  }
  revalidatePath('/inventario');
  volverCon(volver, 'ok', `Entrada de ${parsed.data.cantidad} unidad(es) registrada`);
}

export async function ajustarStockAction(formData: FormData) {
  const session = await requireDueno();
  const id = String(formData.get('productoId') ?? '');
  const parsed = ajusteStockSchema.safeParse(campos(formData, ['productoId', 'stockReal', 'nota']));
  if (!parsed.success) volverCon(`/inventario/${id}`, 'error', parsed.error.issues[0]?.message ?? 'Datos inválidos');

  await ajustarStock(session.user.tenantId, session.user.id, parsed.data);
  revalidatePath('/inventario');
  volverCon(`/inventario/${id}`, 'ok', 'Stock ajustado');
}

export async function toggleActivoProductoAction(formData: FormData) {
  const session = await requireDueno();
  const id = String(formData.get('id') ?? '');
  const activo = formData.get('activo') === 'true';
  await toggleActivoProducto(session.user.tenantId, id, activo);
  revalidatePath('/inventario');
  volverCon(`/inventario/${id}`, 'ok', activo ? 'Producto activado' : 'Producto desactivado');
}
