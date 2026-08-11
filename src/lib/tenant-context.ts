import { headers } from 'next/headers';
import type { Tenant } from '@prisma/client';
import { dbAdmin } from '@/lib/db';

/**
 * Lee el subdominio que el middleware ya extrajo del Host (x-tenant-subdominio)
 * y resuelve el tenant vía app_admin (BYPASSRLS) — es la única consulta
 * legítima "de cualquier tenant" que no pasa por withTenant(), porque en
 * este punto todavía no sabemos cuál es "el nuestro".
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  const h = await headers();
  const subdominio = h.get('x-tenant-subdominio');
  if (!subdominio) return null;
  return dbAdmin.tenant.findUnique({ where: { subdominio } });
}
