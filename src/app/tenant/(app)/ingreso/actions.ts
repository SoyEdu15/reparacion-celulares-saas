'use server';

import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/guards';
import { ingresoEquipoSchema } from '@/lib/validation/reparacion';
import { crearReparacion } from '@/server/services/reparaciones';
import { notificarCambioEstado } from '@/server/services/notificaciones';

function str(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function bool(fd: FormData, name: string): boolean {
  return fd.get(name) === 'on' || fd.get(name) === 'true';
}

function num(fd: FormData, name: string): number | null {
  const v = str(fd, name);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function volverConError(formData: FormData, mensaje: string): never {
  const qs = new URLSearchParams();
  const clienteId = str(formData, 'clienteId');
  if (clienteId) qs.set('clienteId', clienteId);
  qs.set('error', mensaje);
  redirect(`/ingreso?${qs.toString()}`);
}

export async function crearReparacionAction(formData: FormData) {
  const session = await requireSession();

  const parsed = ingresoEquipoSchema.safeParse({
    clienteId: str(formData, 'clienteId'),
    clienteNombre: str(formData, 'clienteNombre'),
    clienteTelefono: str(formData, 'clienteTelefono'),
    clienteCedula: str(formData, 'clienteCedula'),
    clienteEmail: str(formData, 'clienteEmail'),

    equipoId: str(formData, 'equipoId'),
    equipoMarca: str(formData, 'equipoMarca'),
    equipoModelo: str(formData, 'equipoModelo'),
    equipoColor: str(formData, 'equipoColor'),
    equipoImei: str(formData, 'equipoImei'),

    danosReportados: str(formData, 'danosReportados') ?? '',
    estadoFisico: str(formData, 'estadoFisico'),

    fechaEstimadaEntrega: str(formData, 'fechaEstimadaEntrega'),
    presupuestoEstimado: num(formData, 'presupuestoEstimado'),
    presupuestoEstimadoAceptado: bool(formData, 'presupuestoEstimadoAceptado'),

    consentimientoDatos: bool(formData, 'consentimientoDatos'),

    pinTipo: str(formData, 'pinTipo'),
    pinValor: str(formData, 'pinValor'),
    consentimientoPin: bool(formData, 'consentimientoPin'),
  });

  if (!parsed.success) {
    volverConError(formData, parsed.error.issues[0]?.message ?? 'Datos inválidos');
  }

  const fotos = formData.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length !== 4) {
    volverConError(formData, 'Debes adjuntar exactamente 4 fotos del equipo');
  }

  const reparacion = await crearReparacion(session.user.tenantId, session.user.id, parsed.data, fotos);
  try {
    await notificarCambioEstado(session.user.tenantId, reparacion.id);
  } catch (e) {
    console.error('No se pudo encolar la notificación de ingreso', e);
  }
  redirect(`/reparaciones/${reparacion.id}/recibo`);
}
