import { withTenant } from '@/lib/rls';
import { ESTADO_LABELS } from '@/lib/estados-reparacion';
import { toCsv } from '@/lib/reportes/csv';

function fecha(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

export async function csvReparaciones(tenantId: string): Promise<string> {
  const reparaciones = await withTenant(tenantId, (tx) =>
    tx.reparacion.findMany({
      orderBy: { numeroOrden: 'asc' },
      include: {
        cliente: { select: { nombre: true, telefono: true } },
        equipo: { select: { marca: true, modelo: true, imei: true } },
        tecnicoAsignado: { select: { nombre: true } },
      },
    }),
  );

  return toCsv(
    [
      'Orden',
      'Fecha recibido',
      'Cliente',
      'Teléfono',
      'Equipo',
      'IMEI',
      'Estado',
      'Técnico',
      'Presupuesto final',
      'Fecha entrega',
      'Garantía hasta',
    ],
    reparaciones.map((r) => [
      r.numeroOrden,
      fecha(r.fechaRecibido),
      r.cliente.nombre,
      r.cliente.telefono,
      `${r.equipo.marca} ${r.equipo.modelo}`,
      r.equipo.imei,
      ESTADO_LABELS[r.estado] ?? r.estado,
      r.tecnicoAsignado?.nombre ?? '',
      r.presupuestoFinal ?? r.presupuestoEstimado,
      fecha(r.fechaEntregaReal),
      fecha(r.fechaFinGarantia),
    ]),
  );
}

export async function csvClientes(tenantId: string): Promise<string> {
  const clientes = await withTenant(tenantId, (tx) =>
    tx.cliente.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { equipos: true, reparaciones: true } } },
    }),
  );

  return toCsv(
    ['Nombre', 'Teléfono', 'Cédula', 'Email', 'Fecha registro', 'Equipos', 'Reparaciones'],
    clientes.map((c) => [
      c.nombre,
      c.telefono,
      c.cedula,
      c.email,
      fecha(c.createdAt),
      c._count.equipos,
      c._count.reparaciones,
    ]),
  );
}

export async function csvFacturas(tenantId: string): Promise<string> {
  const facturas = await withTenant(tenantId, (tx) =>
    tx.factura.findMany({
      orderBy: { numeroFactura: 'asc' },
      include: {
        reparacion: { select: { numeroOrden: true, cliente: { select: { nombre: true } } } },
      },
    }),
  );

  return toCsv(
    ['Factura', 'Fecha', 'Orden', 'Cliente', 'Subtotal reparación', 'Cargo bodegaje', 'Total'],
    facturas.map((f) => [
      f.numeroFactura,
      fecha(f.createdAt),
      f.reparacion.numeroOrden,
      f.reparacion.cliente.nombre,
      f.subtotalReparacion,
      f.cargoBodegaje,
      f.total,
    ]),
  );
}
