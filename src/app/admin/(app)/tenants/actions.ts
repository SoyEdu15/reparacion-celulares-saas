'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import type { EstadoTenant } from '@prisma/client';
import { requireSuperAdmin } from '@/lib/auth/admin-guards';
import { crearTenantSchema } from '@/lib/validation/tenant';
import { crearTenant, cambiarEstadoTenant } from '@/server/services/admin-tenants';
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
  });
  if (!parsed.success) {
    redirect(`/tenants?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  let tenant;
  try {
    tenant = await crearTenant({
      subdominio: parsed.data.subdominio,
      nombreComercial: parsed.data.nombreComercial,
      whatsappContactoSoporte: parsed.data.whatsappContactoSoporte || null,
    });
  } catch (e) {
    if (esSubdominioDuplicado(e)) {
      redirect('/tenants?error=Ese%20subdominio%20ya%20existe');
    }
    throw e;
  }

  await registrarAuditoriaAdmin(admin.superAdminId, 'crear_tenant', tenant.id, { subdominio: tenant.subdominio });
  revalidatePath('/tenants');
  redirect(`/tenants/${tenant.id}`);
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
