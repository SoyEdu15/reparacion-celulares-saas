import type { Prisma } from '@prisma/client';
import { dbAdmin } from '@/lib/db';

/** Log de auditoría de acciones de super-admin (sección 7) — nunca opcional en una mutación admin. */
export async function registrarAuditoriaAdmin(
  superAdminId: string,
  accion: string,
  tenantId: string | null,
  detalle?: Prisma.InputJsonValue,
): Promise<void> {
  await dbAdmin.auditLogAdmin.create({
    data: { superAdminId, accion, tenantId, detalle },
  });
}
