import { auth, signOut } from '@/lib/auth/tenant-auth';

export default async function DashboardPage() {
  const session = await auth();

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui' }}>
      <h1>Bienvenido, {session?.user.name}</h1>
      <p>Rol: {session?.user.rol}</p>
      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>tenant_id: {session?.user.tenantId}</p>
      <form action={logout}>
        <button type="submit" style={{ marginTop: 16 }}>
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
