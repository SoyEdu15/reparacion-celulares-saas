import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { getCurrentTenant } from '@/lib/tenant-context';
import { signIn } from '@/lib/auth/tenant-auth';
import { presignLogoView } from '@/lib/storage/r2';
import { saludoSegunHora } from '@/lib/saludo';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [tenant, { error }] = await Promise.all([getCurrentTenant(), searchParams]);
  const nombre = tenant?.nombreComercial || process.env.PLATFORM_NAME || 'Tu App de Reparaciones';
  const logoSrc = tenant?.logoUrl ? await presignLogoView(tenant.logoUrl) : null;
  const saludo = saludoSegunHora();

  async function login(formData: FormData) {
    'use server';
    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: '/dashboard',
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect('/login?error=credenciales');
      }
      throw err;
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        {logoSrc ? <img src={logoSrc} alt={nombre} className="auth-logo" /> : null}
        <span className="auth-greeting">👋 {saludo}</span>
        <h1>Bienvenido a {nombre}</h1>
        <p className="auth-subtitle">Ingresa con tu cuenta de dueño o técnico</p>
        {error ? <p className="auth-error">Email o contraseña incorrectos.</p> : null}
        <form action={login} className="auth-form">
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}
