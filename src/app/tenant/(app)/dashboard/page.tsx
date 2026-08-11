import { auth } from '@/lib/auth/tenant-auth';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <>
      <div className="page-header">
        <h1>Bienvenido, {session?.user.name}</h1>
      </div>
      <div className="card">
        <p>Rol: {session?.user.rol}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>tenant_id: {session?.user.tenantId}</p>
      </div>
    </>
  );
}
