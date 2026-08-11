import type { EstadoTenant } from '@prisma/client';
import { dbAdmin } from '@/lib/db';

export function listarTenants() {
  return dbAdmin.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { usuarios: true, reparaciones: true } } },
  });
}

export function obtenerTenant(id: string) {
  return dbAdmin.tenant.findUnique({
    where: { id },
    include: {
      usuarios: { orderBy: { rol: 'asc' } },
      pagosSuscripcion: { orderBy: { createdAt: 'desc' }, take: 10 },
      auditLogsAdmin: { orderBy: { createdAt: 'desc' }, take: 20, include: { superAdmin: { select: { nombre: true } } } },
      _count: { select: { reparaciones: true, clientes: true } },
    },
  });
}

export function cambiarEstadoTenant(id: string, estado: EstadoTenant) {
  return dbAdmin.tenant.update({ where: { id }, data: { estado } });
}

export function crearTenant(data: { subdominio: string; nombreComercial: string; whatsappContactoSoporte: string | null }) {
  return dbAdmin.tenant.create({ data: { ...data, estado: 'ACTIVO' } });
}
