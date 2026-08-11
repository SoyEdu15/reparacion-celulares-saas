import type { Tenant } from '@prisma/client';

const MENSAJE_POR_ESTADO: Record<string, string> = {
  MOROSO: 'La suscripción de este taller está pendiente de pago.',
  SUSPENDIDO: 'Este taller está suspendido temporalmente.',
};

export function PantallaSuspendido({ tenant }: { tenant: Tenant }) {
  const nombre = tenant.nombreComercial ?? tenant.subdominio;
  const mensaje = MENSAJE_POR_ESTADO[tenant.estado] ?? 'Este taller no está disponible en este momento.';
  const whatsapp = tenant.whatsappContactoSoporte;
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola, quiero poner al día la suscripción de ${nombre}.`)}`
    : null;

  return (
    <main className="auth-screen">
      <div className="auth-card suspendido-card">
        <span className="suspendido-badge">{tenant.estado === 'MOROSO' ? 'Pago pendiente' : 'Suspendido'}</span>
        <h1>{nombre}</h1>
        <p className="auth-subtitle">{mensaje}</p>
        {whatsappHref ? (
          <a className="whatsapp-link" href={whatsappHref} target="_blank" rel="noreferrer">
            Escribir por WhatsApp
          </a>
        ) : (
          <p className="auth-subtitle">Contacta al soporte de la plataforma para regularizar el acceso.</p>
        )}
      </div>
    </main>
  );
}
