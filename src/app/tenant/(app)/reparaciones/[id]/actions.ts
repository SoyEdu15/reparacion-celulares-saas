'use server';

import { redirect } from 'next/navigation';
import type { CanalAprobacion } from '@prisma/client';
import { requireSession } from '@/lib/auth/guards';
import {
  tomarEquipo,
  completarDiagnostico,
  registrarAprobacion,
  avanzarEstado,
  entregarReparacion,
  marcarFueraDeFlujo,
} from '@/server/services/reparacion-estados';

function str(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function num(fd: FormData, name: string): number | null {
  const v = str(fd, name);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function fotos(fd: FormData): File[] {
  return fd.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0);
}

function volver(id: string, error?: string): never {
  redirect(error ? `/reparaciones/${id}?error=${encodeURIComponent(error)}` : `/reparaciones/${id}`);
}

export async function tomarEquipoAction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, 'reparacionId')!;
  try {
    await tomarEquipo(session.user.tenantId, id, session.user.id);
  } catch (e) {
    volver(id, e instanceof Error ? e.message : 'No se pudo actualizar');
  }
  volver(id);
}

export async function completarDiagnosticoAction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, 'reparacionId')!;
  const diagnosticoTexto = str(formData, 'diagnosticoTexto');
  if (!diagnosticoTexto) {
    volver(id, 'El diagnóstico no puede quedar vacío');
  }
  try {
    await completarDiagnostico(session.user.tenantId, id, session.user.id, {
      diagnosticoTexto,
      presupuestoFinal: num(formData, 'presupuestoFinal'),
    });
  } catch (e) {
    volver(id, e instanceof Error ? e.message : 'No se pudo actualizar');
  }
  volver(id);
}

export async function registrarAprobacionAction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, 'reparacionId')!;
  const canal = str(formData, 'canalAprobacion') as CanalAprobacion | null;
  if (!canal) {
    volver(id, 'Indica cómo aprobó el cliente');
  }
  try {
    await registrarAprobacion(session.user.tenantId, id, session.user.id, canal);
  } catch (e) {
    volver(id, e instanceof Error ? e.message : 'No se pudo actualizar');
  }
  volver(id);
}

export async function avanzarEstadoAction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, 'reparacionId')!;
  const nuevoEstado = str(formData, 'nuevoEstado');
  if (!nuevoEstado) {
    volver(id, 'Estado inválido');
  }
  const archivos = fotos(formData);
  if (archivos.length > 4) {
    volver(id, 'Máximo 4 fotos por cambio de estado');
  }
  try {
    await avanzarEstado(session.user.tenantId, id, session.user.id, nuevoEstado as never, {
      notaCorta: str(formData, 'notaCorta'),
      fotos: archivos,
    });
  } catch (e) {
    volver(id, e instanceof Error ? e.message : 'No se pudo actualizar');
  }
  volver(id);
}

export async function entregarAction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, 'reparacionId')!;
  const archivos = fotos(formData);
  if (archivos.length > 4) {
    volver(id, 'Máximo 4 fotos por cambio de estado');
  }
  try {
    await entregarReparacion(session.user.tenantId, id, session.user.id, {
      notaCorta: str(formData, 'notaCorta'),
      fotos: archivos,
    });
  } catch (e) {
    volver(id, e instanceof Error ? e.message : 'No se pudo actualizar');
  }
  redirect(`/reparaciones/${id}/comprobante`);
}

export async function marcarFueraDeFlujoAction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, 'reparacionId')!;
  const estado = str(formData, 'estado');
  if (estado !== 'NO_REPARABLE' && estado !== 'CANCELADO') {
    volver(id, 'Estado inválido');
  }
  const archivos = fotos(formData);
  try {
    await marcarFueraDeFlujo(session.user.tenantId, id, session.user.id, estado, {
      notaCorta: str(formData, 'notaCorta'),
      fotos: archivos,
    });
  } catch (e) {
    volver(id, e instanceof Error ? e.message : 'No se pudo actualizar');
  }
  volver(id);
}
