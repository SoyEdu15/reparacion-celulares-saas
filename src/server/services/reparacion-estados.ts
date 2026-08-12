import type { CanalAprobacion, EstadoReparacion } from '@prisma/client';
import { withTenant } from '@/lib/rls';
import { uploadFoto } from '@/lib/storage/r2';

const TRANSICIONES_VALIDAS: Record<string, EstadoReparacion[]> = {
  ESPERANDO_TECNICO: ['DIAGNOSTICO', 'NO_REPARABLE', 'CANCELADO'],
  DIAGNOSTICO: ['REPARANDO', 'ESPERANDO_APROBACION_CLIENTE', 'NO_REPARABLE', 'CANCELADO'],
  ESPERANDO_APROBACION_CLIENTE: ['REPARANDO', 'NO_REPARABLE', 'CANCELADO'],
  REPARANDO: ['TESTEO', 'NO_REPARABLE', 'CANCELADO'],
  TESTEO: ['LISTO_PARA_ENTREGA', 'NO_REPARABLE', 'CANCELADO'],
  LISTO_PARA_ENTREGA: ['ENTREGADO'],
};

async function subirFotosDeEstado(
  tenantId: string,
  reparacionId: string,
  usuarioId: string,
  historialEstadoId: string,
  fotos: File[],
) {
  if (fotos.length === 0) return;
  const keys = await Promise.all(fotos.map((f) => uploadFoto(tenantId, reparacionId, f)));
  await withTenant(tenantId, (tx) =>
    tx.fotoEquipo.createMany({
      data: keys.map((storageKey, i) => ({
        tenantId,
        reparacionId,
        historialEstadoId,
        esFotoIngreso: false,
        storageKey,
        orden: i + 1,
        subidoPorId: usuarioId,
      })),
    }),
  );
}

/**
 * El técnico toma un equipo de la cola y empieza el diagnóstico
 * (autoasignación). Se valida que quien ejecuta sea un técnico activo —
 * un dueño autoasignándose como "técnico" no tiene sentido; para eso el
 * dueño usa asignarTecnico() y elige a quién.
 */
export async function tomarEquipo(tenantId: string, reparacionId: string, usuarioId: string) {
  return withTenant(tenantId, async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || usuario.rol !== 'TECNICO' || !usuario.activo) {
      throw new Error('Solo un técnico activo puede tomar un equipo de la cola');
    }

    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    if (actual.estado !== 'ESPERANDO_TECNICO') {
      throw new Error(`No se puede tomar una reparación en estado ${actual.estado}`);
    }
    const actualizada = await tx.reparacion.update({
      where: { id: reparacionId },
      data: { estado: 'DIAGNOSTICO', tecnicoAsignadoId: usuarioId, tecnicoAsignadoEn: new Date() },
    });
    await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: 'DIAGNOSTICO',
        usuarioId,
        notaCorta: 'Técnico tomó el equipo para diagnóstico',
      },
    });
    return actualizada;
  });
}

/**
 * El dueño (o el propio técnico, eligiéndose a sí mismo) asigna un técnico
 * específico desde la cola — a diferencia de tomarEquipo(), quien ejecuta
 * la acción no tiene que ser el técnico asignado.
 */
export async function asignarTecnico(tenantId: string, reparacionId: string, usuarioId: string, tecnicoId: string) {
  return withTenant(tenantId, async (tx) => {
    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    if (actual.estado !== 'ESPERANDO_TECNICO') {
      throw new Error(`No se puede asignar técnico en estado ${actual.estado}`);
    }

    const tecnico = await tx.usuario.findUnique({ where: { id: tecnicoId } });
    if (!tecnico || tecnico.rol !== 'TECNICO' || !tecnico.activo) {
      throw new Error('El técnico seleccionado no es válido');
    }

    const actualizada = await tx.reparacion.update({
      where: { id: reparacionId },
      data: { estado: 'DIAGNOSTICO', tecnicoAsignadoId: tecnico.id, tecnicoAsignadoEn: new Date() },
    });
    await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: 'DIAGNOSTICO',
        usuarioId,
        notaCorta: `Asignado a ${tecnico.nombre}`,
      },
    });
    return actualizada;
  });
}

const ESTADOS_CERRADOS = new Set(['ENTREGADO', 'NO_REPARABLE', 'CANCELADO']);

/**
 * Anticipo (abono): el cliente puede dejarlo en el ingreso o agregarlo/
 * actualizarlo después, mientras la orden siga activa. Se descuenta del
 * total en la factura final (ver entregarReparacion) — nunca es un pago
 * completo por sí solo.
 */
export async function registrarAnticipo(tenantId: string, reparacionId: string, usuarioId: string, anticipo: number) {
  return withTenant(tenantId, async (tx) => {
    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    if (ESTADOS_CERRADOS.has(actual.estado)) {
      throw new Error('No se puede registrar un anticipo en una orden ya cerrada');
    }

    const actualizada = await tx.reparacion.update({
      where: { id: reparacionId },
      data: { anticipo },
    });

    await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: actual.estado,
        usuarioId,
        notaCorta: `Anticipo actualizado a ${anticipo.toLocaleString('es-CO')} COP`,
      },
    });

    return actualizada;
  });
}

/**
 * Diagnóstico (sección 4.2): nunca se salta, incluso con presupuesto
 * previo. Dos caminos:
 *  - Si ya había un presupuesto aceptado en el ingreso y el técnico no
 *    da uno distinto -> pasa directo a REPARANDO, sin re-pedir aprobación.
 *  - Si no había presupuesto previo, o el técnico cotiza uno distinto ->
 *    ESPERANDO_APROBACION_CLIENTE con el nuevo presupuestoFinal.
 */
export async function completarDiagnostico(
  tenantId: string,
  reparacionId: string,
  usuarioId: string,
  data: { diagnosticoTexto: string; presupuestoFinal: number | null },
) {
  return withTenant(tenantId, async (tx) => {
    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    if (actual.estado !== 'DIAGNOSTICO') {
      throw new Error(`No se puede completar diagnóstico en estado ${actual.estado}`);
    }

    const confirmaPresupuestoPrevio =
      actual.presupuestoEstimado != null &&
      actual.presupuestoEstimadoAceptado &&
      (data.presupuestoFinal == null || data.presupuestoFinal === actual.presupuestoEstimado);

    const nuevoEstado: EstadoReparacion = confirmaPresupuestoPrevio ? 'REPARANDO' : 'ESPERANDO_APROBACION_CLIENTE';
    const presupuestoFinal = confirmaPresupuestoPrevio ? actual.presupuestoEstimado : data.presupuestoFinal;

    if (!confirmaPresupuestoPrevio && presupuestoFinal == null) {
      throw new Error('Debes indicar el presupuesto a cotizar para el cliente');
    }

    const actualizada = await tx.reparacion.update({
      where: { id: reparacionId },
      data: {
        estado: nuevoEstado,
        diagnosticoTexto: data.diagnosticoTexto,
        diagnosticadoPorId: usuarioId,
        diagnosticadoEn: new Date(),
        presupuestoFinal,
      },
    });

    await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: nuevoEstado,
        usuarioId,
        notaCorta: confirmaPresupuestoPrevio
          ? 'Diagnóstico confirma el presupuesto ya aceptado'
          : 'Diagnóstico completado, requiere aprobación del cliente',
      },
    });

    return actualizada;
  });
}

/** Registro manual de la aprobación del cliente (por teléfono/WhatsApp — nunca entra a la plataforma). */
export async function registrarAprobacion(
  tenantId: string,
  reparacionId: string,
  usuarioId: string,
  canalAprobacion: CanalAprobacion,
) {
  return withTenant(tenantId, async (tx) => {
    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    if (actual.estado !== 'ESPERANDO_APROBACION_CLIENTE') {
      throw new Error(`No se puede registrar aprobación en estado ${actual.estado}`);
    }
    const actualizada = await tx.reparacion.update({
      where: { id: reparacionId },
      data: {
        estado: 'REPARANDO',
        presupuestoAprobadoEn: new Date(),
        presupuestoAprobadoPorId: usuarioId,
        canalAprobacion,
      },
    });
    await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: 'REPARANDO',
        usuarioId,
        notaCorta: `Cliente aprobó el presupuesto (${canalAprobacion})`,
      },
    });
    return actualizada;
  });
}

/**
 * Transición genérica para el resto del flujo (REPARANDO→TESTEO→
 * LISTO_PARA_ENTREGA, y las rutas alternas NO_REPARABLE/CANCELADO). La
 * entrega final (→ENTREGADO) tiene su propio flujo porque genera la
 * factura — ver entregarReparacion().
 */
export async function avanzarEstado(
  tenantId: string,
  reparacionId: string,
  usuarioId: string,
  nuevoEstado: EstadoReparacion,
  data: { notaCorta: string | null; fotos: File[] },
) {
  if (nuevoEstado === 'ENTREGADO') {
    throw new Error('Usa entregarReparacion() para la transición a ENTREGADO');
  }

  const actualizada = await withTenant(tenantId, async (tx) => {
    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    const permitidos = TRANSICIONES_VALIDAS[actual.estado] ?? [];
    if (!permitidos.includes(nuevoEstado)) {
      throw new Error(`No se puede pasar de ${actual.estado} a ${nuevoEstado}`);
    }

    const data_: Record<string, unknown> = { estado: nuevoEstado };
    // Quien marca que la reparación quedó lista para probar es quien queda
    // registrado como "reparadoPor" (sección 6: "quién lo reparó").
    if (actual.estado === 'REPARANDO' && nuevoEstado === 'TESTEO') {
      data_.reparadoPorId = usuarioId;
    }

    const reparacion = await tx.reparacion.update({ where: { id: reparacionId }, data: data_ });

    const historial = await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: nuevoEstado,
        usuarioId,
        notaCorta: data.notaCorta,
      },
    });

    return { reparacion, historialId: historial.id };
  });

  await subirFotosDeEstado(tenantId, reparacionId, usuarioId, actualizada.historialId, data.fotos);
  return actualizada.reparacion;
}

/**
 * Entrega (sección 4.3 + 4.4 + 5): calcula bodegaje si se pasó la custodia
 * gratis, genera la factura interna con numeración consecutiva por tenant,
 * y si el tenant tiene garantía activa registra días_garantia/
 * fecha_fin_garantia a partir de la fecha real de entrega. La granularidad
 * "por tipo de reparación" que menciona la sección 4.4 queda para más
 * adelante (no hay todavía un CRUD de tipos_reparacion) — por ahora se usa
 * el valor por defecto del tenant para todas las reparaciones.
 */
export async function entregarReparacion(
  tenantId: string,
  reparacionId: string,
  usuarioId: string,
  data: { notaCorta: string | null; fotos: File[] },
) {
  const resultado = await withTenant(tenantId, async (tx) => {
    const actual = await tx.reparacion.findUniqueOrThrow({ where: { id: reparacionId } });
    if (actual.estado !== 'LISTO_PARA_ENTREGA') {
      throw new Error(`No se puede entregar una reparación en estado ${actual.estado}`);
    }

    const tenantGarantia = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { garantiaActiva: true, diasGarantiaDefault: true },
    });

    const ahora = new Date();
    let fechaFinGarantia: Date | null = null;
    let diasGarantia: number | null = null;
    if (tenantGarantia.garantiaActiva && tenantGarantia.diasGarantiaDefault > 0) {
      diasGarantia = tenantGarantia.diasGarantiaDefault;
      fechaFinGarantia = new Date(ahora);
      fechaFinGarantia.setDate(fechaFinGarantia.getDate() + diasGarantia);
    }

    const reparacion = await tx.reparacion.update({
      where: { id: reparacionId },
      data: { estado: 'ENTREGADO', fechaEntregaReal: ahora, diasGarantia, fechaFinGarantia },
    });

    const historial = await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId,
        estadoAnterior: actual.estado,
        estadoNuevo: 'ENTREGADO',
        usuarioId,
        notaCorta: data.notaCorta,
      },
    });

    const subtotalReparacion = reparacion.presupuestoFinal ?? reparacion.presupuestoEstimado ?? 0;
    let diasBodegajeCobrados = 0;
    if (reparacion.fechaLimiteCustodia && ahora > reparacion.fechaLimiteCustodia) {
      const msPorDia = 1000 * 60 * 60 * 24;
      diasBodegajeCobrados = Math.ceil((ahora.getTime() - reparacion.fechaLimiteCustodia.getTime()) / msPorDia);
    }

    const tenant = await tx.tenant.update({
      where: { id: tenantId },
      data: { ultimoNumeroFactura: { increment: 1 } },
      select: { ultimoNumeroFactura: true, tarifaBodegajeDiaria: true, plantillaFacturaDefault: true, formatoFacturaDefault: true },
    });
    const cargoBodegaje = diasBodegajeCobrados * tenant.tarifaBodegajeDiaria;

    const factura = await tx.factura.create({
      data: {
        tenantId,
        reparacionId,
        numeroFactura: tenant.ultimoNumeroFactura,
        plantilla: tenant.plantillaFacturaDefault,
        formato: tenant.formatoFacturaDefault,
        subtotalReparacion,
        cargoBodegaje,
        diasBodegajeCobrados,
        anticipo: reparacion.anticipo,
        total: subtotalReparacion + cargoBodegaje,
      },
    });

    return { reparacion, historialId: historial.id, factura };
  });

  await subirFotosDeEstado(tenantId, reparacionId, usuarioId, resultado.historialId, data.fotos);
  return resultado;
}

/** Rutas alternas: NO_REPARABLE / CANCELADO, desde cualquier estado en curso. */
export async function marcarFueraDeFlujo(
  tenantId: string,
  reparacionId: string,
  usuarioId: string,
  estado: 'NO_REPARABLE' | 'CANCELADO',
  data: { notaCorta: string | null; fotos: File[] },
) {
  return avanzarEstado(tenantId, reparacionId, usuarioId, estado, data);
}
