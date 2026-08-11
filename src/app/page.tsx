export default function RootPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui' }}>
      <h1>{process.env.PLATFORM_NAME ?? 'Tu App de Reparaciones'}</h1>
      <p>Accede desde el subdominio de tu taller, por ejemplo tallerdemo1.localhost:3000.</p>
    </main>
  );
}
