import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __dbTenant: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __dbAdmin: PrismaClient | undefined;
}

/**
 * Conexión con el rol `app_tenant` (RLS forzado por Postgres). Nunca se
 * consulta directamente — pasa siempre por `withTenant()` en lib/rls.ts,
 * que fija `app.tenant_id` antes de correr cualquier query.
 */
export const dbTenant =
  globalThis.__dbTenant ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

/**
 * Conexión con el rol `app_admin` (BYPASSRLS). Solo para el panel
 * super-admin, jobs cross-tenant, y la resolución de subdominio del Paso 1
 * del login. Nunca debe recibir un tenant_id que venga del cliente/frontend.
 */
export const dbAdmin =
  globalThis.__dbAdmin ??
  new PrismaClient({
    datasources: { db: { url: process.env.ADMIN_DATABASE_URL } },
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__dbTenant = dbTenant;
  globalThis.__dbAdmin = dbAdmin;
}
