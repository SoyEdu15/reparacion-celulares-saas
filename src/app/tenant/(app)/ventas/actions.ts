'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno, requireSession } from '@/lib/auth/guards';
import { ventaSchema } from '@/lib/validation/cuentas';
import { fechaMovimiento } from '@/lib/fechas-bogota';
import { anularVenta, registrarVenta } from '@/server/services/ventas';
import { ErrorInventario } from '@/server/services/inventario';

function conError(mensaje: string): never {
  redirect(`/ventas?error=${encodeURIComponent(mensaje)}`);
}

export async function registrarVentaAction(formData: FormData) {
  const session = await requireSession();

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    conError('Datos de la venta inválidos');
  }

  const parsed = ventaSchema.safeParse({
    metodoPago: formData.get('metodoPago'),
    cliente: formData.get('cliente'),
    nota: formData.get('nota'),
    fecha: formData.get('fecha'),
    items,
  });
  if (!parsed.success) conError(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const { fecha, ...data } = parsed.data;
  let ventaId: string;
  try {
    const venta = await registrarVenta(session.user.tenantId, session.user.id, {
      ...data,
      fecha: fechaMovimiento(fecha),
    });
    ventaId = venta.id;
  } catch (error) {
    if (error instanceof ErrorInventario) conError(error.message);
    throw error;
  }

  revalidatePath('/ventas');
  revalidatePath('/inventario');
  redirect(`/ventas?ok=${ventaId}`);
}

export async function anularVentaAction(formData: FormData) {
  const session = await requireDueno();
  const id = String(formData.get('id') ?? '');
  const volver = String(formData.get('volver') ?? '/ventas');
  await anularVenta(session.user.tenantId, id);
  revalidatePath('/ventas');
  revalidatePath('/inventario');
  redirect(volver.startsWith('/ventas') ? volver : '/ventas');
}
