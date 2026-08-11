import type { EstadoReparacion } from '@prisma/client';
import { withTenant } from '@/lib/rls';
import { encryptPin } from '@/lib/crypto/pin-encryption';
import { uploadFoto, presignFotoView } from '@/lib/storage/r2';
import type { IngresoEquipoInput } from '@/lib/validation/reparacion';

/**
 * Purga manual del PIN/patrón (sección 7.1). Sobrescribe el valor cifrado
 * (la columna es NOT NULL, así que no se puede dejar en null; el vacío +
 * purgadoEn seteado es la señal de "ya no hay nada que descifrar aquí").
 * Queda quién y cuándo purgó, para auditoría.
 */
export function purgarPin(tenantId: string, reparacionId: string, usuarioId: string) {
  return withTenant(tenantId, (tx) =>
    tx.pinDesbloqueo.update({
      where: { reparacionId },
      data: { valorCifrado: '', purgadoEn: new Date(), purgadoPorId: usuarioId },
    }),
  );
}

export function listarReparaciones(tenantId: string, estado?: EstadoReparacion) {
  return withTenant(tenantId, (tx) =>
    tx.reparacion.findMany({
      where: estado ? { estado } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        equipo: { select: { id: true, marca: true, modelo: true } },
        tecnicoAsignado: { select: { id: true, nombre: true } },
      },
    }),
  );
}

export async function obtenerReparacionDetalle(tenantId: string, id: string) {
  const reparacion = await withTenant(tenantId, (tx) =>
    tx.reparacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        equipo: true,
        tipoReparacion: true,
        recibidoPor: { select: { id: true, nombre: true } },
        tecnicoAsignado: { select: { id: true, nombre: true } },
        diagnosticadoPor: { select: { id: true, nombre: true } },
        reparadoPor: { select: { id: true, nombre: true } },
        presupuestoAprobadoPor: { select: { id: true, nombre: true } },
        pinDesbloqueo: true,
        fotos: { orderBy: [{ esFotoIngreso: 'desc' }, { createdAt: 'asc' }] },
        historialEstados: {
          orderBy: { createdAt: 'asc' },
          include: { usuario: { select: { id: true, nombre: true } } },
        },
      },
    }),
  );
  if (!reparacion) return null;

  const fotosConUrl = await Promise.all(
    reparacion.fotos.map(async (foto) => ({ ...foto, url: await presignFotoView(foto.storageKey) })),
  );

  return { ...reparacion, fotos: fotosConUrl };
}

/**
 * Ingreso de equipo (sección 4.1): todo en una sola operación — cliente
 * (existente o nuevo), equipo (existente o nuevo), la reparación entra
 * directo a la cola ESPERANDO_TECNICO (recibido/esperando_técnico son,
 * en la práctica de un mostrador, el mismo instante: no hay una revisión
 * manual intermedia entre "se recibe" y "queda en cola"), snapshot de la
 * política de custodia vigente, y el PIN solo si hay valor + consentimiento
 * específico. Las fotos se suben después de crear la fila (necesitan el
 * id de la reparación para la ruta en el bucket).
 */
export async function crearReparacion(tenantId: string, recibidoPorId: string, data: IngresoEquipoInput, fotos: File[]) {
  const reparacion = await withTenant(tenantId, async (tx) => {
    let clienteId = data.clienteId;
    if (!clienteId) {
      const cliente = await tx.cliente.create({
        data: {
          tenantId,
          nombre: data.clienteNombre!,
          telefono: data.clienteTelefono!,
          cedula: data.clienteCedula,
          email: data.clienteEmail,
        },
      });
      clienteId = cliente.id;
    }

    let equipoId = data.equipoId;
    if (equipoId) {
      const equipoExistente = await tx.equipo.findUnique({ where: { id: equipoId } });
      if (!equipoExistente || equipoExistente.clienteId !== clienteId) {
        throw new Error('El equipo seleccionado no pertenece a este cliente');
      }
    } else {
      const equipo = await tx.equipo.create({
        data: {
          tenantId,
          clienteId,
          marca: data.equipoMarca!,
          modelo: data.equipoModelo!,
          color: data.equipoColor,
          imei: data.equipoImei,
        },
      });
      equipoId = equipo.id;
    }

    const tenant = await tx.tenant.update({
      where: { id: tenantId },
      data: { ultimoNumeroOrden: { increment: 1 } },
      select: { ultimoNumeroOrden: true, diasCustodiaGratis: true },
    });

    const fechaLimiteCustodia = new Date();
    fechaLimiteCustodia.setDate(fechaLimiteCustodia.getDate() + tenant.diasCustodiaGratis);

    const nuevaReparacion = await tx.reparacion.create({
      data: {
        tenantId,
        clienteId,
        equipoId,
        numeroOrden: tenant.ultimoNumeroOrden,
        estado: 'ESPERANDO_TECNICO',
        danosReportados: data.danosReportados,
        estadoFisico: data.estadoFisico,
        recibidoPorId,
        presupuestoEstimado: data.presupuestoEstimado,
        presupuestoEstimadoAceptado: data.presupuestoEstimado != null && data.presupuestoEstimadoAceptado,
        fechaEstimadaEntrega: data.fechaEstimadaEntrega ? new Date(data.fechaEstimadaEntrega) : null,
        diasCustodiaGratisAplicado: tenant.diasCustodiaGratis,
        fechaLimiteCustodia,
        consentimientoDatosAceptadoEn: new Date(),
      },
    });

    await tx.historialEstado.create({
      data: {
        tenantId,
        reparacionId: nuevaReparacion.id,
        estadoAnterior: null,
        estadoNuevo: 'ESPERANDO_TECNICO',
        usuarioId: recibidoPorId,
        notaCorta: 'Equipo recibido',
      },
    });

    if (data.pinValor && data.consentimientoPin && data.pinTipo) {
      await tx.pinDesbloqueo.create({
        data: {
          tenantId,
          reparacionId: nuevaReparacion.id,
          tipo: data.pinTipo,
          valorCifrado: encryptPin(data.pinValor),
          consentimientoAceptadoEn: new Date(),
        },
      });
    }

    return nuevaReparacion;
  });

  const keys = await Promise.all(fotos.map((foto) => uploadFoto(tenantId, reparacion.id, foto)));

  await withTenant(tenantId, (tx) =>
    tx.fotoEquipo.createMany({
      data: keys.map((storageKey, i) => ({
        tenantId,
        reparacionId: reparacion.id,
        esFotoIngreso: true,
        storageKey,
        orden: i + 1,
        subidoPorId: recibidoPorId,
      })),
    }),
  );

  return reparacion;
}
