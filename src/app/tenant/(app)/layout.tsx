import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/tenant-auth';

/**
 * Gate del Paso 2: sin sesión, todo lo que cuelga de este layout redirige
 * a /login. El tenant_id de la sesión viene del JWT (fijado en el
 * callback jwt de tenant-auth.ts a partir del usuario autenticado), nunca
 * de algo que el cliente pueda mandar en la request.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <>{children}</>;
}
