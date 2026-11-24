'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno } from '@/lib/auth/guards';
import { gastoSchema } from '@/lib/validation/cuentas';
import { fechaMovimiento } from '@/lib/fechas-bogota';
import { eliminarGasto, registrarGasto } from '@/server/services/gastos';

export async function registrarGastoAction(formData: FormData) {
  const session = await requireDueno();
  const parsed = gastoSchema.safeParse({
    categoria: formData.get('categoria'),
    descripcion: formData.get('descripcion'),
    monto: formData.get('monto'),
    fecha: formData.get('fecha'),
  });
  if (!parsed.success) {
    redirect(`/gastos?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }
  const { fecha, ...data } = parsed.data;
  await registrarGasto(session.user.tenantId, session.user.id, { ...data, fecha: fechaMovimiento(fecha) });
  revalidatePath('/gastos');
  redirect('/gastos?ok=1');
}

export async function eliminarGastoAction(formData: FormData) {
  const session = await requireDueno();
  await eliminarGasto(session.user.tenantId, String(formData.get('id') ?? ''));
  revalidatePath('/gastos');
  const volver = String(formData.get('volver') ?? '/gastos');
  redirect(volver.startsWith('/gastos') ? volver : '/gastos');
}
