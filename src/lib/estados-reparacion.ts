import type { EstadoReparacion } from '@prisma/client';

export const ESTADO_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  ESPERANDO_TECNICO: 'Esperando técnico',
  DIAGNOSTICO: 'En diagnóstico',
  ESPERANDO_APROBACION_CLIENTE: 'Esperando aprobación del cliente',
  REPARANDO: 'Reparando',
  TESTEO: 'En testeo',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado',
  NO_REPARABLE: 'No reparable',
  CANCELADO: 'Cancelado',
};

export function badgeClassParaEstado(estado: string): string {
  if (estado === 'NO_REPARABLE' || estado === 'CANCELADO') return 'badge-danger';
  return 'badge-activo';
}

export const ESTADOS_ORDEN: EstadoReparacion[] = [
  'ESPERANDO_TECNICO',
  'DIAGNOSTICO',
  'ESPERANDO_APROBACION_CLIENTE',
  'REPARANDO',
  'TESTEO',
  'LISTO_PARA_ENTREGA',
  'ENTREGADO',
  'NO_REPARABLE',
  'CANCELADO',
];
