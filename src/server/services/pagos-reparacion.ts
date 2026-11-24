import type { MetodoPago, Prisma, TipoPagoReparacion } from '@prisma/client';
import { withTenant } from '@/lib/rls';
import { METODO_PAGO_LABELS } from '@/lib/cuentas-labels';

/**
 * Pagos de una reparación con orden: abonos antes de entregar, el pago del
 * saldo al entregar y devoluciones. Sirven para la caja del día (qué plata
 * entró y cómo). La ganancia NO sale de aquí: la reparación se reconoce
 * completa el día de la entrega, con su factura (ver services/cuentas.ts).
 *
 * Reparacion.anticipo se mantiene como la suma de los abonos, porque lo usan
 * el recibo, la factura y los correos.
 */

export class ErrorPago extends Error {}

const ESTADOS_CERRADOS = new Set(['ENTREGADO', 'NO_REPARABLE', 'CANCELADO']);

type PagoMin = { tipo: TipoPagoReparacion; monto: number };

/** Plata neta que el cliente ha dejado en la orden (abonos + saldo − devoluciones). */
export function netoPagado(pagos: PagoMin[]): number {
  return pagos.reduce((s, p) => s + (p.tipo === 'DEVOLUCION' ? -p.monto : p.monto), 0);
}

function cop(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

async function bloquearReparacion(tx: Prisma.TransactionClient, reparacionId: string) {
  await tx.$queryRaw`SELECT id FROM reparaciones WHERE id = ${reparacionId} FOR UPDATE`;
  return tx.reparacion.findUnique({ where: { id: reparacionId } });
}

async function recalcularAnticipo(tx: Prisma.TransactionClient, reparacionId: string) {
  const abonos = await tx.pagoReparacion.aggregate({
    where: { reparacionId, tipo: 'ABONO' },
    _sum: { monto: true },
  });
  await tx.reparacion.update({ where: { id: reparacionId }, data: { anticipo: abonos._sum.monto ?? 0 } });
}

async function anotarEnHistorial(
  tx: Prisma.TransactionClient,
  tenantId: string,
  reparacion: { id: string; estado: string },
  usuarioId: string,
  nota: string,
) {
  await tx.historialEstado.create({
    data: {
      tenantId,
      reparacionId: reparacion.id,
      estadoAnterior: reparacion.estado as never,
      estadoNuevo: reparacion.estado as never,
      usuarioId,
      notaCorta: nota.slice(0, 200),
    },
  });
}

/** Usado dentro de la transacción de crearReparacion: el abono que deja el cliente al ingresar el equipo. */
export async function crearAbonoInicial(
  tx: Prisma.TransactionClient,
  data: { tenantId: string; reparacionId: string; usuarioId: string; monto: number; metodoPago: MetodoPago },
) {
  if (data.monto <= 0) return;
  await tx.pagoReparacion.create({
    data: {
      tenantId: data.tenantId,
      reparacionId: data.reparacionId,
      tipo: 'ABONO',
      monto: data.monto,
      metodoPago: data.metodoPago,
      nota: 'Abono al ingresar el equipo',
      registradoPorId: data.usuarioId,
    },
  });
}

/**
 * Usado dentro de la transacción de entregarReparacion: registra lo que el
 * cliente paga al recoger (total − lo ya abonado). Si abonó de más, queda
 * una devolución por la diferencia. Devuelve lo que ya estaba pagado antes
 * de entregar (va a la factura como "anticipo").
 */
export async function registrarCobroEntrega(
  tx: Prisma.TransactionClient,
  data: { tenantId: string; reparacionId: string; usuarioId: string; total: number; metodoPago: MetodoPago },
) {
  const pagos = await tx.pagoReparacion.findMany({ where: { reparacionId: data.reparacionId }, select: { tipo: true, monto: true } });
  const yaPagado = netoPagado(pagos);
  const saldo = data.total - yaPagado;
  if (saldo > 0) {
    await tx.pagoReparacion.create({
      data: {
        tenantId: data.tenantId,
        reparacionId: data.reparacionId,
        tipo: 'SALDO',
        monto: saldo,
        metodoPago: data.metodoPago,
        registradoPorId: data.usuarioId,
      },
    });
  } else if (saldo < 0) {
    await tx.pagoReparacion.create({
      data: {
        tenantId: data.tenantId,
        reparacionId: data.reparacionId,
        tipo: 'DEVOLUCION',
        monto: -saldo,
        metodoPago: data.metodoPago,
        nota: 'Se devolvió lo que sobró del abono',
        registradoPorId: data.usuarioId,
      },
    });
  }
  return { yaPagado, saldo };
}

export async function registrarAbono(
  tenantId: string,
  usuarioId: string,
  data: { reparacionId: string; monto: number; metodoPago: MetodoPago; nota?: string },
) {
  return withTenant(tenantId, async (tx) => {
    const rep = await bloquearReparacion(tx, data.reparacionId);
    if (!rep) throw new ErrorPago('La orden no existe');
    if (ESTADOS_CERRADOS.has(rep.estado)) throw new ErrorPago('La orden ya está cerrada: no se le pueden agregar abonos');

    await tx.pagoReparacion.create({
      data: {
        tenantId,
        reparacionId: rep.id,
        tipo: 'ABONO',
        monto: data.monto,
        metodoPago: data.metodoPago,
        nota: data.nota ?? null,
        registradoPorId: usuarioId,
      },
    });
    await recalcularAnticipo(tx, rep.id);
    await anotarEnHistorial(tx, tenantId, rep, usuarioId, `Abono de ${cop(data.monto)} (${METODO_PAGO_LABELS[data.metodoPago]})`);
  });
}

/** Solo para órdenes cerradas sin reparar (no reparable / cancelada): se le regresa plata al cliente. */
export async function registrarDevolucion(
  tenantId: string,
  usuarioId: string,
  data: { reparacionId: string; monto: number; metodoPago: MetodoPago; nota?: string },
) {
  return withTenant(tenantId, async (tx) => {
    const rep = await bloquearReparacion(tx, data.reparacionId);
    if (!rep) throw new ErrorPago('La orden no existe');
    if (rep.estado !== 'NO_REPARABLE' && rep.estado !== 'CANCELADO') {
      throw new ErrorPago('Solo se registran devoluciones en órdenes no reparables o canceladas');
    }
    const pagos = await tx.pagoReparacion.findMany({ where: { reparacionId: rep.id }, select: { tipo: true, monto: true } });
    const neto = netoPagado(pagos);
    if (data.monto > neto) throw new ErrorPago(`No puedes devolver más de lo que dejó el cliente (${cop(neto)})`);

    await tx.pagoReparacion.create({
      data: {
        tenantId,
        reparacionId: rep.id,
        tipo: 'DEVOLUCION',
        monto: data.monto,
        metodoPago: data.metodoPago,
        nota: data.nota ?? null,
        registradoPorId: usuarioId,
      },
    });
    await anotarEnHistorial(tx, tenantId, rep, usuarioId, `Devolución al cliente de ${cop(data.monto)}`);
  });
}

/**
 * Borra un abono registrado por error (mientras la orden siga abierta) o una
 * devolución. El pago al entregar no se borra: hace parte de la factura.
 */
export async function eliminarPago(tenantId: string, usuarioId: string, pagoId: string) {
  return withTenant(tenantId, async (tx) => {
    const pago = await tx.pagoReparacion.findUnique({ where: { id: pagoId } });
    if (!pago) throw new ErrorPago('El pago no existe');
    const rep = await bloquearReparacion(tx, pago.reparacionId);
    if (!rep) throw new ErrorPago('La orden no existe');

    if (pago.tipo === 'SALDO') throw new ErrorPago('El pago de la entrega no se puede borrar: hace parte de la factura');
    if (pago.tipo === 'ABONO' && ESTADOS_CERRADOS.has(rep.estado)) {
      throw new ErrorPago('La orden ya está cerrada: sus abonos no se pueden borrar');
    }

    await tx.pagoReparacion.delete({ where: { id: pago.id } });
    await recalcularAnticipo(tx, rep.id);
    await anotarEnHistorial(
      tx,
      tenantId,
      rep,
      usuarioId,
      `Se borró ${pago.tipo === 'ABONO' ? 'un abono' : 'una devolución'} de ${cop(pago.monto)}`,
    );
  });
}

export async function listarPagosDeReparacion(tenantId: string, reparacionId: string) {
  return withTenant(tenantId, (tx) =>
    tx.pagoReparacion.findMany({
      where: { reparacionId },
      orderBy: { fecha: 'asc' },
      include: { registradoPor: { select: { nombre: true } } },
    }),
  );
}

/** Pagos de reparaciones en un rango (para la página de ventas y la caja). */
export async function listarPagosReparacion(tenantId: string, desde: Date, hasta: Date) {
  return withTenant(tenantId, (tx) =>
    tx.pagoReparacion.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      orderBy: { fecha: 'desc' },
      include: {
        registradoPor: { select: { nombre: true } },
        reparacion: {
          select: {
            id: true,
            numeroOrden: true,
            estado: true,
            cliente: { select: { nombre: true } },
            equipo: { select: { marca: true, modelo: true } },
          },
        },
      },
    }),
  );
}
