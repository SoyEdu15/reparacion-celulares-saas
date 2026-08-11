import Link from 'next/link';
import { auth, signOut } from '@/lib/auth/admin-auth';

export async function AdminNav() {
  const session = await auth();

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <nav className="app-nav">
      <Link href="/tenants">Tenants</Link>
      <div className="app-nav-spacer" />
      <span className="app-nav-user">{session?.user?.name}</span>
      <form action={logout}>
        <button type="submit" className="btn btn-secondary">
          Salir
        </button>
      </form>
    </nav>
  );
}
