import type { Prisma } from '@prisma/client';
import { dbTenant } from './db';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Punto de entrada obligatorio para toda query de negocio de un tenant.
 * Abre una transacción sobre el rol `app_tenant` (RLS forzado) y fija
 * `app.tenant_id` con `set_config(..., true)` — el `true` final lo hace
 * `LOCAL`, es decir, solo vale para esta transacción, nunca se filtra a la
 * siguiente conexión reutilizada del pool.
 *
 * `tenantId` debe venir siempre del contexto de sesión ya resuelto en el
 * Paso 1 del login (middleware), nunca de un valor que el cliente pueda
 * enviar directamente en el body/query de una request.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_PATTERN.test(tenantId)) {
    throw new Error(`tenantId inválido: ${tenantId}`);
  }

  return dbTenant.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
