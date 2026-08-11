import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/tenant-auth';

/**
 * Server Actions son endpoints POST independientes — se pueden invocar
 * directamente sin pasar por el layout que renderizó la página. Por eso
 * cada Server Action que lee/escribe datos llama esto (o requireDueno)
 * de nuevo, en vez de asumir que el layout ya lo validó.
 */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function requireDueno(): Promise<Session> {
  const session = await requireSession();
  if (session.user.rol !== 'DUENO') {
    redirect('/dashboard');
  }
  return session;
}
