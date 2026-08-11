import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth/admin-auth';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    'use server';
    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: '/tenants',
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
        <h1>Panel de super-admin</h1>
        <p className="auth-subtitle">Acceso exclusivo del dueño de la plataforma</p>
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
