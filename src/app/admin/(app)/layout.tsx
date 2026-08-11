import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/admin-auth';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return (
    <div className="app-shell">
      <AdminNav />
      <main className="app-main">{children}</main>
    </div>
  );
}
