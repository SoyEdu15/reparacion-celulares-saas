import { withTenant } from '@/lib/rls';

export function listarClientes(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.cliente.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }));
}

/** Búsqueda por teléfono o cédula (sección 4.1: "busca por teléfono/cédula"). */
export function buscarClientes(tenantId: string, q: string) {
  return withTenant(tenantId, (tx) =>
    tx.cliente.findMany({
      where: {
        OR: [{ telefono: { contains: q } }, { cedula: { contains: q } }, { nombre: { contains: q, mode: 'insensitive' } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  );
}

export function obtenerCliente(tenantId: string, id: string) {
  return withTenant(tenantId, (tx) =>
    tx.cliente.findUnique({
      where: { id },
      include: { equipos: { orderBy: { createdAt: 'desc' } } },
    }),
  );
}

type DatosCliente = { nombre: string; telefono: string; cedula: string; email: string };

export function crearCliente(tenantId: string, data: DatosCliente) {
  return withTenant(tenantId, (tx) =>
    tx.cliente.create({
      data: {
        tenantId,
        nombre: data.nombre,
        telefono: data.telefono,
        cedula: data.cedula || null,
        email: data.email || null,
      },
    }),
  );
}

export function editarCliente(tenantId: string, id: string, data: DatosCliente) {
  return withTenant(tenantId, (tx) =>
    tx.cliente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        cedula: data.cedula || null,
        email: data.email || null,
      },
    }),
  );
}
