import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/tenant-auth';
import { AppNav } from '@/components/tenant/app-nav';
import { getCurrentTenant } from '@/lib/tenant-context';
import { terminosAlDia } from '@/lib/legal';

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
  // El dueño firma el contrato del taller: hasta que acepte la versión vigente
  // de los documentos legales no puede usar la app (los técnicos no firman).
  if (session.user.rol === 'DUENO') {
    const tenant = await getCurrentTenant();
    if (tenant && !terminosAlDia(tenant)) redirect('/aceptar-terminos');
  }
  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <a href="/legal/terminos">Términos</a>
        <a href="/legal/privacidad">Privacidad</a>
        <a href="/legal/politica-datos">Política de datos del taller</a>
        <a href="/legal/sla">Soporte y disponibilidad</a>
      </footer>
    </div>
  );
}
