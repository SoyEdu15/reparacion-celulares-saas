export default function RootPage() {
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <h1>{process.env.PLATFORM_NAME ?? 'Tu App de Reparaciones'}</h1>
        <p className="auth-subtitle">
          Para entrar, abre el enlace de tu taller que te entregó el administrador de la plataforma.
        </p>
        <p className="auth-legal">
          <a href="/legal/terminos">Términos</a> · <a href="/legal/privacidad">Privacidad</a>
        </p>
      </div>
    </main>
  );
}
