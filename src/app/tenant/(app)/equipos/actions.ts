'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/guards';
import { equipoSchema, editarEquipoSchema } from '@/lib/validation/equipo';
import { crearEquipo, editarEquipo } from '@/server/services/equipos';

export async function crearEquipoAction(formData: FormData) {
  const session = await requireSession();
  const clienteId = formData.get('clienteId');

  const parsed = equipoSchema.safeParse({
    clienteId,
    marca: formData.get('marca'),
    modelo: formData.get('modelo'),
    color: formData.get('color') ?? '',
    imei: formData.get('imei') ?? '',
  });
  if (!parsed.success) {
    redirect(`/clientes/${clienteId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  const equipo = await crearEquipo(session.user.tenantId, parsed.data.clienteId, parsed.data);
  revalidatePath(`/clientes/${parsed.data.clienteId}`);
  redirect(`/equipos/${equipo.id}`);
}

export async function editarEquipoAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get('id');

  const parsed = editarEquipoSchema.safeParse({
    id,
    clienteId: formData.get('clienteId'),
    marca: formData.get('marca'),
    modelo: formData.get('modelo'),
    color: formData.get('color') ?? '',
    imei: formData.get('imei') ?? '',
  });
  if (!parsed.success) {
    redirect(`/equipos/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  await editarEquipo(session.user.tenantId, parsed.data.id, parsed.data);
  revalidatePath(`/equipos/${parsed.data.id}`);
  redirect(`/equipos/${parsed.data.id}?ok=1`);
}
