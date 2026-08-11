import { withTenant } from '@/lib/rls';

export function listarEquipos(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.equipo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { cliente: { select: { id: true, nombre: true } } },
    }),
  );
}

export function obtenerEquipo(tenantId: string, id: string) {
  return withTenant(tenantId, (tx) =>
    tx.equipo.findUnique({
      where: { id },
      include: { cliente: { select: { id: true, nombre: true } } },
    }),
  );
}

type DatosEquipo = { marca: string; modelo: string; color: string; imei: string };

export function crearEquipo(tenantId: string, clienteId: string, data: DatosEquipo) {
  return withTenant(tenantId, (tx) =>
    tx.equipo.create({
      data: {
        tenantId,
        clienteId,
        marca: data.marca,
        modelo: data.modelo,
        color: data.color || null,
        imei: data.imei || null,
      },
    }),
  );
}

export function editarEquipo(tenantId: string, id: string, data: DatosEquipo) {
  return withTenant(tenantId, (tx) =>
    tx.equipo.update({
      where: { id },
      data: {
        marca: data.marca,
        modelo: data.modelo,
        color: data.color || null,
        imei: data.imei || null,
      },
    }),
  );
}
