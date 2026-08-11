import type { EstadoReparacion } from '@prisma/client';
import { ESTADO_LABELS } from '@/lib/estados-reparacion';

export function mensajeCambioEstado(params: {
  clienteNombre: string;
  numeroOrden: number;
  equipoMarca: string;
  equipoModelo: string;
  estadoNuevo: EstadoReparacion;
  notaCorta: string | null;
}): string {
  const partes = [
    `Hola ${params.clienteNombre},`,
    `tu equipo ${params.equipoMarca} ${params.equipoModelo} (orden #${params.numeroOrden}) cambió de estado: ${
      ESTADO_LABELS[params.estadoNuevo] ?? params.estadoNuevo
    }.`,
  ];
  if (params.notaCorta) partes.push(params.notaCorta);
  return partes.join(' ');
}

export function mensajeRecordatorioCustodia(params: {
  clienteNombre: string;
  numeroOrden: number;
  equipoMarca: string;
  equipoModelo: string;
}): string {
  return `Hola ${params.clienteNombre}, tu equipo ${params.equipoMarca} ${params.equipoModelo} (orden #${params.numeroOrden}) sigue listo para recoger. Recuerda que aplican cargos de bodegaje mientras no lo reclames.`;
}
