'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireDueno } from '@/lib/auth/guards';
import { configuracionTenantSchema } from '@/lib/validation/configuracion-tenant';
import { actualizarConfiguracion, actualizarLogo } from '@/server/services/configuracion-tenant';

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

function bool(fd: FormData, name: string): boolean {
  return fd.get(name) === 'on';
}

function num(fd: FormData, name: string): number {
  const n = Number(str(fd, name));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function numONull(fd: FormData, name: string): number | null {
  const raw = str(fd, name);
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function actualizarConfiguracionAction(formData: FormData) {
  const session = await requireDueno();

  const parsed = configuracionTenantSchema.safeParse({
    nombreComercial: str(formData, 'nombreComercial'),
    nit: str(formData, 'nit'),
    direccion: str(formData, 'direccion'),
    telefono: str(formData, 'telefono'),
    piePaginaFactura: str(formData, 'piePaginaFactura'),
    remitenteEmailFacturas: str(formData, 'remitenteEmailFacturas'),
    plantillaFacturaDefault: str(formData, 'plantillaFacturaDefault'),
    formatoFacturaDefault: str(formData, 'formatoFacturaDefault'),
    diasCustodiaGratis: num(formData, 'diasCustodiaGratis'),
    tarifaBodegajeDiaria: num(formData, 'tarifaBodegajeDiaria'),
    intervaloRecordatorioDias: num(formData, 'intervaloRecordatorioDias'),
    diasLimiteAbandono: num(formData, 'diasLimiteAbandono'),
    garantiaActiva: bool(formData, 'garantiaActiva'),
    diasGarantiaDefault: num(formData, 'diasGarantiaDefault'),
    diasPurgaPin: numONull(formData, 'diasPurgaPin'),
    whatsappActivo: bool(formData, 'whatsappActivo'),
    emailActivo: bool(formData, 'emailActivo'),
  });

  if (!parsed.success) {
    redirect(`/configuracion?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  await actualizarConfiguracion(session.user.tenantId, parsed.data);
  revalidatePath('/configuracion');
  redirect('/configuracion?ok=1');
}

export async function subirLogoAction(formData: FormData) {
  const session = await requireDueno();

  const file = formData.get('logo');
  if (!(file instanceof File) || file.size === 0) {
    redirect('/configuracion?error=Selecciona%20una%20imagen');
  }
  if (file.size > 2 * 1024 * 1024) {
    redirect('/configuracion?error=La%20imagen%20no%20puede%20pesar%20m%C3%A1s%20de%202MB');
  }

  try {
    await actualizarLogo(session.user.tenantId, file);
  } catch (e) {
    redirect(`/configuracion?error=${encodeURIComponent(e instanceof Error ? e.message : 'No se pudo subir el logo')}`);
  }

  revalidatePath('/configuracion');
  redirect('/configuracion?ok=1');
}
