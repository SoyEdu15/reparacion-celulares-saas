import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/admin-auth';

export type AdminSession = {
  superAdminId: string;
  nombre: string;
  email: string;
};

export async function requireSuperAdmin(): Promise<AdminSession> {
  const session = await auth();
  const superAdminId = (session as { superAdminId?: string } | null)?.superAdminId;
  if (!session?.user || !superAdminId) {
    redirect('/login');
  }
  return {
    superAdminId,
    nombre: session.user.name ?? '',
    email: session.user.email ?? '',
  };
}
