'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno, requireSession } from '@/lib/auth/guards';
import { pagoReparacionSchema } from '@/lib/validation/cuentas';
import { ErrorPago, eliminarPago, registrarAbono, registrarDevolucion } from '@/server/services/pagos-reparacion';

// Sin hash en la URL (ver costos-actions.ts): con `#pagos` Next no vuelve a
// pintar la página al redirigir a la misma ruta.
function volver(id: string, error?: string): never {
  redirect(`/reparaciones/${id}${error ? `?error=${encodeURIComponent(error)}` : ''}`);
}

function leer(formData: FormData) {
  return pagoReparacionSchema.safeParse({
    reparacionId: String(formData.get('reparacionId') ?? ''),
    monto: formData.get('monto') ?? undefined,
    metodoPago: formData.get('metodoPago') ?? undefined,
    nota: formData.get('nota') ?? undefined,
  });
}

function refrescar(id: string) {
  revalidatePath(`/reparaciones/${id}`);
  revalidatePath('/ventas');
  revalidatePath('/cuentas');
}

/** Cualquiera del taller recibe abonos (antes el técnico también podía actualizar el anticipo). */
export async function registrarAbonoAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get('reparacionId') ?? '');
  const parsed = leer(formData);
  if (!parsed.success) volver(id, parsed.error.issues[0]?.message ?? 'Datos inválidos');
  try {
    await registrarAbono(session.user.tenantId, session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof ErrorPago) volver(id, e.message);
    throw e;
  }
  refrescar(id);
  volver(id);
}

export async function registrarDevolucionAction(formData: FormData) {
  const session = await requireDueno();
  const id = String(formData.get('reparacionId') ?? '');
  const parsed = leer(formData);
  if (!parsed.success) volver(id, parsed.error.issues[0]?.message ?? 'Datos inválidos');
  try {
    await registrarDevolucion(session.user.tenantId, session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof ErrorPago) volver(id, e.message);
    throw e;
  }
  refrescar(id);
  volver(id);
}

export async function eliminarPagoAction(formData: FormData) {
  const session = await requireDueno();
  const id = String(formData.get('reparacionId') ?? '');
  try {
    await eliminarPago(session.user.tenantId, session.user.id, String(formData.get('pagoId') ?? ''));
  } catch (e) {
    if (e instanceof ErrorPago) volver(id, e.message);
    throw e;
  }
  refrescar(id);
  volver(id);
}
