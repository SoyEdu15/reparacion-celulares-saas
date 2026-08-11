'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/guards';
import { clienteSchema, editarClienteSchema } from '@/lib/validation/cliente';
import { crearCliente, editarCliente } from '@/server/services/clientes';

export async function crearClienteAction(formData: FormData) {
  const session = await requireSession();

  const parsed = clienteSchema.safeParse({
    nombre: formData.get('nombre'),
    telefono: formData.get('telefono'),
    cedula: formData.get('cedula') ?? '',
    email: formData.get('email') ?? '',
  });
  if (!parsed.success) {
    redirect(`/clientes?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  const cliente = await crearCliente(session.user.tenantId, parsed.data);
  revalidatePath('/clientes');
  redirect(`/clientes/${cliente.id}`);
}

export async function editarClienteAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get('id');

  const parsed = editarClienteSchema.safeParse({
    id,
    nombre: formData.get('nombre'),
    telefono: formData.get('telefono'),
    cedula: formData.get('cedula') ?? '',
    email: formData.get('email') ?? '',
  });
  if (!parsed.success) {
    redirect(`/clientes/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  await editarCliente(session.user.tenantId, parsed.data.id, parsed.data);
  revalidatePath(`/clientes/${parsed.data.id}`);
  redirect(`/clientes/${parsed.data.id}?ok=1`);
}
