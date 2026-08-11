'use server';

import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { cambiarPasswordPropiaSchema } from '@/lib/validation/usuario';
import { cambiarPasswordPropia } from '@/server/services/usuarios';

export async function cambiarPasswordAction(formData: FormData) {
  const session = await requireSession();

  const parsed = cambiarPasswordPropiaSchema.safeParse({
    passwordActual: formData.get('passwordActual'),
    passwordNueva: formData.get('passwordNueva'),
    passwordConfirmar: formData.get('passwordConfirmar'),
  });
  if (!parsed.success) {
    redirect(`/perfil?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Datos inválidos')}`);
  }

  const resultado = await cambiarPasswordPropia(
    session.user.tenantId,
    session.user.id,
    parsed.data.passwordActual,
    parsed.data.passwordNueva,
  );
  if (!resultado.ok) {
    redirect(`/perfil?error=${encodeURIComponent(resultado.error)}`);
  }

  redirect('/perfil?ok=1');
}
