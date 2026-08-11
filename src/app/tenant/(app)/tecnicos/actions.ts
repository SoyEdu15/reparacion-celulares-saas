'use server';

import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno } from '@/lib/auth/guards';
import { crearTecnicoSchema, editarTecnicoSchema, toggleActivoSchema } from '@/lib/validation/usuario';
import { crearTecnico, editarUsuario, toggleActivoUsuario } from '@/server/services/usuarios';

function esEmailDuplicado(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function crearTecnicoAction(formData: FormData) {
  const session = await requireDueno();

  const parsed = crearTecnicoSchema.safeParse({
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect(`/tecnicos?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  try {
    await crearTecnico(session.user.tenantId, parsed.data);
  } catch (error) {
    if (esEmailDuplicado(error)) {
      redirect('/tecnicos?error=Ese%20email%20ya%20está%20en%20uso%20en%20este%20taller');
    }
    throw error;
  }

  revalidatePath('/tecnicos');
  redirect('/tecnicos?ok=1');
}

export async function editarTecnicoAction(formData: FormData) {
  const session = await requireDueno();

  const parsed = editarTecnicoSchema.safeParse({
    id: formData.get('id'),
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    password: formData.get('password') ?? '',
  });
  if (!parsed.success) {
    redirect(`/tecnicos?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  try {
    await editarUsuario(session.user.tenantId, {
      ...parsed.data,
      password: parsed.data.password || undefined,
    });
  } catch (error) {
    if (esEmailDuplicado(error)) {
      redirect('/tecnicos?error=Ese%20email%20ya%20está%20en%20uso%20en%20este%20taller');
    }
    throw error;
  }

  revalidatePath('/tecnicos');
  redirect('/tecnicos?ok=1');
}

export async function toggleActivoTecnicoAction(formData: FormData) {
  const session = await requireDueno();

  const parsed = toggleActivoSchema.safeParse({
    id: formData.get('id'),
    activo: formData.get('activo') === 'true',
  });
  if (!parsed.success) {
    redirect('/tecnicos?error=Datos%20inválidos');
  }

  await toggleActivoUsuario(session.user.tenantId, parsed.data.id, parsed.data.activo);
  revalidatePath('/tecnicos');
  redirect('/tecnicos?ok=1');
}
