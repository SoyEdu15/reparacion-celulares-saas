import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/tenant-auth';
import { getCurrentTenant } from '@/lib/tenant-context';
import { LEGAL_FECHA, LEGAL_VERSION, terminosAlDia } from '@/lib/legal';
import { aceptarTerminosAction } from './actions';

/**
 * El dueño debe aceptar los documentos legales antes de usar la app, y de
 * nuevo cada vez que suba LEGAL_VERSION. Vive fuera del grupo (app) para
 * que el gate de ese layout no la redirija a sí misma.
 */
export default async function AceptarTerminosPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [session, tenant, { error }] = await Promise.all([auth(), getCurrentTenant(), searchParams]);
  if (!session?.user) redirect('/login');
  if (session.user.rol !== 'DUENO' || !tenant || terminosAlDia(tenant)) redirect('/dashboard');

  const reacepta = tenant.terminosVersionAceptada != null;

  return (
    <main className="auth-screen">
      <div className="auth-card legal-aceptar">
        <h1>{reacepta ? 'Actualizamos nuestros documentos legales' : 'Antes de empezar'}</h1>
        <p className="auth-subtitle">
          {reacepta
            ? `Para seguir usando la plataforma, revisa y acepta la versión ${LEGAL_VERSION} (${LEGAL_FECHA}).`
            : 'Como dueño del taller, revisa y acepta los documentos que rigen el servicio. Solo se pide una vez.'}
        </p>
        {error ? <p className="auth-error">Debes marcar las tres casillas para continuar.</p> : null}
        <form action={aceptarTerminosAction} className="legal-aceptar-form">
          <label>
            <input type="checkbox" name="terminos" required />
            <span>
              Leí y acepto los{' '}
              <a href="/legal/terminos" target="_blank" rel="noreferrer">
                Términos y Condiciones
              </a>{' '}
              y el{' '}
              <a href="/legal/sla" target="_blank" rel="noreferrer">
                Acuerdo de Nivel de Servicio
              </a>
              .
            </span>
          </label>
          <label>
            <input type="checkbox" name="privacidad" required />
            <span>
              Leí la{' '}
              <a href="/legal/privacidad" target="_blank" rel="noreferrer">
                Política de Privacidad
              </a>{' '}
              y autorizo el tratamiento de mis datos y los de mis usuarios según ella.
            </span>
          </label>
          <label>
            <input type="checkbox" name="tratamiento" required />
            <span>
              Acepto el{' '}
              <a href="/legal/tratamiento-datos" target="_blank" rel="noreferrer">
                Acuerdo de Tratamiento de Datos
              </a>
              : mi taller es el Responsable de los datos de sus clientes y la plataforma los trata como Encargado.
              Revisaré y adoptaré la{' '}
              <a href="/legal/politica-datos" target="_blank" rel="noreferrer">
                política de datos de mi taller
              </a>
              .
            </span>
          </label>
          <button type="submit">Aceptar y continuar</button>
        </form>
      </div>
    </main>
  );
}
