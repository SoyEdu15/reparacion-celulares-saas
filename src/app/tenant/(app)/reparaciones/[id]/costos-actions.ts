'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno } from '@/lib/auth/guards';
import { costoReparacionSchema } from '@/lib/validation/cuentas';
import { agregarCostoReparacion, eliminarCostoReparacion } from '@/server/services/gastos';
import { ErrorInventario } from '@/server/services/inventario';

/**
 * Sin `#costos` en la URL: si la página ya está en /reparaciones/:id, Next
 * trata un redirect a la misma ruta + hash como un salto dentro de la página
 * y no vuelve a pintar los datos — el costo se guardaba pero la tarjeta
 * seguía mostrando lo anterior.
 */
function volver(id: string, error?: string): never {
  redirect(`/reparaciones/${id}${error ? `?error=${encodeURIComponent(error)}` : ''}`);
}

export async function agregarCostoReparacionAction(formData: FormData) {
  const session = await requireDueno();
  const reparacionId = String(formData.get('reparacionId') ?? '');
  const parsed = costoReparacionSchema.safeParse({
    reparacionId,
    tipo: formData.get('tipo'),
    productoId: formData.get('productoId') ?? '',
    descripcion: formData.get('descripcion'),
    cantidad: formData.get('cantidad') || undefined,
    monto: formData.get('monto') || undefined,
  });
  if (!parsed.success) volver(reparacionId, parsed.error.issues[0]?.message ?? 'Datos inválidos');

  try {
    await agregarCostoReparacion(session.user.tenantId, session.user.id, parsed.data);
  } catch (error) {
    if (error instanceof ErrorInventario) volver(reparacionId, error.message);
    throw error;
  }
  revalidatePath(`/reparaciones/${reparacionId}`);
  revalidatePath('/inventario');
  volver(reparacionId);
}

export async function eliminarCostoReparacionAction(formData: FormData) {
  const session = await requireDueno();
  const reparacionId = String(formData.get('reparacionId') ?? '');
  await eliminarCostoReparacion(session.user.tenantId, String(formData.get('id') ?? ''));
  revalidatePath(`/reparaciones/${reparacionId}`);
  revalidatePath('/inventario');
  volver(reparacionId);
}
