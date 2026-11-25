'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireDueno } from '@/lib/auth/guards';
import { withTenant } from '@/lib/rls';
import { LEGAL_VERSION } from '@/lib/legal';

/**
 * Guarda la aceptación electrónica (Ley 527 de 1999) de los Términos, la
 * Política de Privacidad y el Acuerdo de Tratamiento de Datos: versión,
 * fecha, usuario e IP, como prueba de que el dueño los aceptó.
 */
export async function aceptarTerminosAction(formData: FormData) {
  const session = await requireDueno();
  const todos = ['terminos', 'privacidad', 'tratamiento'].every((k) => formData.get(k) === 'on');
  if (!todos) redirect('/aceptar-terminos?error=1');

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || null;

  await withTenant(session.user.tenantId, (tx) =>
    tx.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        terminosVersionAceptada: LEGAL_VERSION,
        terminosAceptadosEn: new Date(),
        terminosAceptadosPorId: session.user.id,
        terminosAceptadosIp: ip ? ip.slice(0, 64) : null,
      },
    }),
  );
  redirect('/dashboard');
}
