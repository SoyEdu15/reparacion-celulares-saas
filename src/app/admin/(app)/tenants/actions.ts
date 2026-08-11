'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import type { EstadoTenant } from '@prisma/client';
import { requireSuperAdmin } from '@/lib/auth/admin-guards';
import { crearTenantSchema, crearDuenoSchema } from '@/lib/validation/tenant';
import { crearTenant, cambiarEstadoTenant, crearDuenoParaTenant } from '@/server/services/admin-tenants';
import { registrarAuditoriaAdmin } from '@/server/services/audit-log-admin';

function esSubdominioDuplicado(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const ESTADOS_VALIDOS: EstadoTenant[] = ['ACTIVO', 'MOROSO', 'SUSPENDIDO'];

export async function crearTenantAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const parsed = crearTenantSchema.safeParse({
    subdominio: formData.get('subdominio'),
    nombreComercial: formData.get('nombreComercial'),
    whatsappContactoSoporte: formData.get('whatsappContactoSoporte') ?? '',
    duenoNombre: formData.get('duenoNombre'),
    duenoEmail: formData.get('duenoEmail'),
    duenoPassword: formData.get('duenoPassword'),
  });
  if (!parsed.success) {
    redirect(`/tenants?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  let resultado;
  try {
    resultado = await crearTenant({
      subdominio: parsed.data.subdominio,
      nombreComercial: parsed.data.nombreComercial,
      whatsappContactoSoporte: parsed.data.whatsappContactoSoporte || null,
      duenoNombre: parsed.data.duenoNombre,
      duenoEmail: parsed.data.duenoEmail,
      duenoPassword: parsed.data.duenoPassword,
    });
  } catch (e) {
    if (esSubdominioDuplicado(e)) {
      redirect('/tenants?error=Ese%20subdominio%20o%20ese%20email%20ya%20existe');
    }
    throw e;
  }

  await registrarAuditoriaAdmin(admin.superAdminId, 'crear_tenant', resultado.tenant.id, {
    subdominio: resultado.tenant.subdominio,
    duenoEmail: resultado.dueno.email,
  });
  revalidatePath('/tenants');
  redirect(`/tenants/${resultado.tenant.id}`);
}

export async function crearDuenoAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const parsed = crearDuenoSchema.safeParse({
    tenantId: formData.get('tenantId'),
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect(`/tenants/${formData.get('tenantId')}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  try {
    const dueno = await crearDuenoParaTenant(parsed.data.tenantId, parsed.data);
    await registrarAuditoriaAdmin(admin.superAdminId, 'crear_dueno', parsed.data.tenantId, { email: dueno.email });
  } catch (e) {
    if (esSubdominioDuplicado(e)) {
      redirect(`/tenants/${parsed.data.tenantId}?error=Ese%20email%20ya%20está%20en%20uso%20en%20este%20tenant`);
    }
    throw e;
  }

  revalidatePath(`/tenants/${parsed.data.tenantId}`);
  redirect(`/tenants/${parsed.data.tenantId}`);
}

export async function cambiarEstadoAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = formData.get('id') as string;
  const estado = formData.get('estado') as string;

  if (!ESTADOS_VALIDOS.includes(estado as EstadoTenant)) {
    redirect(`/tenants/${id}?error=Estado%20inv%C3%A1lido`);
  }

  await cambiarEstadoTenant(id, estado as EstadoTenant);
  await registrarAuditoriaAdmin(admin.superAdminId, `cambiar_estado_a_${estado.toLowerCase()}`, id);
  revalidatePath(`/tenants/${id}`);
  redirect(`/tenants/${id}`);
}
