import type { ReactNode } from 'react';
import { getCurrentTenant } from '@/lib/tenant-context';
import { PantallaSuspendido } from '@/components/tenant/pantalla-suspendido';
import '../globals.css';

/**
 * Layout raíz de todo el subdominio del taller (Paso 1 del login, sección
 * 3.1). Corta acá si el tenant no existe o no está activo: ningún hijo de
 * este layout (incluida /login) se llega a renderizar en esos casos, así
 * que un tenant suspendido nunca ve el formulario de credenciales.
 */
export default async function TenantRootLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <html lang="es">
        <body>
          <main className="auth-screen">
            <div className="auth-card suspendido-card">
              <h1>Taller no encontrado</h1>
              <p className="auth-subtitle">Verifica la dirección o contacta al soporte de la plataforma.</p>
            </div>
          </main>
        </body>
      </html>
    );
  }

  if (tenant.estado !== 'ACTIVO') {
    return (
      <html lang="es">
        <body>
          <PantallaSuspendido tenant={tenant} />
        </body>
      </html>
    );
  }

  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
