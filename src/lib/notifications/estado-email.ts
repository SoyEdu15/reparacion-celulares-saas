import type { EstadoReparacion } from '@prisma/client';
import { ESTADO_LABELS } from '@/lib/estados-reparacion';
import { emailShellHtml, fotosGridHtml, type TenantBranding } from './email-shell';

type DatosOrden = {
  tenant: TenantBranding;
  tieneLogo: boolean;
  clienteNombre: string;
  numeroOrden: number;
  equipoMarca: string;
  equipoModelo: string;
};

/**
 * Correo de cada cambio de estado (ingreso ya tiene su propia plantilla,
 * ver recibo-email.ts; la factura de entrega también, ver
 * factura-email.ts). Cuando el paso anterior fue el diagnóstico, muestra
 * el detalle de lo que encontró el técnico — es lo que le sirve al
 * cliente como "qué le pasó a mi equipo", no solo el nombre del estado.
 * Las fotos son las que se subieron justo en este cambio de estado, si
 * las hay (ver avanzarEstado/entregarReparacion).
 */
export function cambioEstadoEmailHtml(
  p: DatosOrden & {
    estadoNuevo: EstadoReparacion;
    notaCorta: string | null;
    diagnosticoTexto: string | null;
    mostrarDiagnostico: boolean;
    fotosCids: string[];
  },
): string {
  const estadoLabel = ESTADO_LABELS[p.estadoNuevo] ?? p.estadoNuevo;
  const cuerpo = `
        <p style="margin:0 0 16px;">Hola ${p.clienteNombre}, tu equipo <strong>${p.equipoMarca} ${p.equipoModelo}</strong> (orden #${p.numeroOrden}) tiene una actualización:</p>
        <div style="display:inline-block;background:#eef2ff;color:#2563eb;padding:8px 16px;border-radius:999px;font-weight:700;font-size:14px;margin-bottom:16px;">${estadoLabel}</div>
        ${p.notaCorta ? `<p style="margin:0 0 12px;color:#374151;">${p.notaCorta}</p>` : ''}
        ${
          p.mostrarDiagnostico && p.diagnosticoTexto
            ? `<div style="background:#f4f5f7;border-radius:8px;padding:12px 14px;margin-top:4px;">
                 <p style="margin:0 0 4px;font-weight:700;font-size:13px;">Diagnóstico del técnico</p>
                 <p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap;">${p.diagnosticoTexto}</p>
               </div>`
            : ''
        }
        ${fotosGridHtml(p.fotosCids)}`;

  return emailShellHtml({ tenant: p.tenant, tieneLogo: p.tieneLogo, cuerpoHtml: cuerpo });
}

/** Correo del recordatorio diario de custodia (equipo listo, sin reclamar). */
export function recordatorioCustodiaEmailHtml(p: DatosOrden): string {
  const cuerpo = `
        <p style="margin:0 0 16px;">Hola ${p.clienteNombre}, tu equipo <strong>${p.equipoMarca} ${p.equipoModelo}</strong> (orden #${p.numeroOrden}) sigue listo para recoger.</p>
        <div style="background:#fffaeb;border:1px solid #fedf89;border-radius:8px;padding:12px 14px;font-size:13px;color:#374151;">
          Recuerda que aplican cargos de bodegaje mientras no lo reclames.
        </div>`;

  return emailShellHtml({ tenant: p.tenant, tieneLogo: p.tieneLogo, cuerpoHtml: cuerpo });
}
