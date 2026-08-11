import type { EstadoTenant } from '@prisma/client';
import { hash } from '@node-rs/argon2';
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

/**
 * Crea el tenant y su primer usuario (dueño) en la misma transacción — un
 * tenant sin ningún usuario queda inaccesible (nadie puede pasar el Paso 2
 * del login), así que esto no es opcional.
 */
export async function crearTenant(data: {
  subdominio: string;
  nombreComercial: string;
  whatsappContactoSoporte: string | null;
  duenoNombre: string;
  duenoEmail: string;
  duenoPassword: string;
}) {
  const passwordHash = await hash(data.duenoPassword);
  return dbAdmin.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        subdominio: data.subdominio,
        nombreComercial: data.nombreComercial,
        whatsappContactoSoporte: data.whatsappContactoSoporte,
        estado: 'ACTIVO',
      },
    });
    const dueno = await tx.usuario.create({
      data: {
        tenantId: tenant.id,
        rol: 'DUENO',
        nombre: data.duenoNombre,
        email: data.duenoEmail,
        passwordHash,
      },
    });
    return { tenant, dueno };
  });
}

/** Para tenants que por alguna razón quedaron sin dueño (ej. creados antes de este fix). */
export async function crearDuenoParaTenant(tenantId: string, data: { nombre: string; email: string; password: string }) {
  const passwordHash = await hash(data.password);
  return dbAdmin.usuario.create({
    data: { tenantId, rol: 'DUENO', nombre: data.nombre, email: data.email, passwordHash },
  });
}
