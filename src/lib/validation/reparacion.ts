import { z } from 'zod';
import { telefonoNullableSchema } from './telefono';

export const tipoPinValues = ['PIN', 'PATRON', 'CONTRASENA', 'OTRO'] as const;

export const ingresoEquipoSchema = z
  .object({
    clienteId: z.string().uuid().nullable(),
    clienteNombre: z.string().trim().max(160).nullable(),
    clienteTelefono: telefonoNullableSchema,
    clienteCedula: z.string().trim().max(20).nullable(),
    clienteEmail: z.string().trim().toLowerCase().max(200).nullable(),

    equipoId: z.string().uuid().nullable(),
    equipoMarca: z.string().trim().max(60).nullable(),
    equipoModelo: z.string().trim().max(60).nullable(),
    equipoColor: z.string().trim().max(40).nullable(),
    equipoImei: z.string().trim().max(40).nullable(),

    danosReportados: z.string().trim().min(3, 'Describe el daño o falla reportado').max(2000),
    estadoFisico: z.string().trim().max(2000).nullable(),

    /** Opcional: si se asigna un técnico ya en el ingreso, la orden entra directo a diagnóstico en vez de a la cola. */
    tecnicoAsignadoId: z.string().uuid().nullable(),

    fechaEstimadaEntrega: z.string().trim().nullable(),
    presupuestoEstimado: z.number().int().positive().nullable(),
    presupuestoEstimadoAceptado: z.boolean(),

    consentimientoDatos: z.boolean().refine((v) => v === true, {
      message: 'Debes aceptar el tratamiento de datos personales (Habeas Data)',
    }),

    pinTipo: z.enum(tipoPinValues).nullable(),
    pinValor: z.string().trim().max(200).nullable(),
    consentimientoPin: z.boolean(),
  })
  .refine((data) => Boolean(data.clienteId) || Boolean(data.clienteNombre && data.clienteTelefono), {
    message: 'Selecciona un cliente existente o completa nombre y teléfono para crear uno nuevo',
    path: ['clienteNombre'],
  })
  .refine((data) => Boolean(data.equipoId) || Boolean(data.equipoMarca && data.equipoModelo), {
    message: 'Selecciona un equipo existente o completa marca y modelo para crear uno nuevo',
    path: ['equipoMarca'],
  })
  .refine((data) => !data.pinValor || data.consentimientoPin, {
    message: 'Para guardar el PIN/patrón, el cliente debe aceptar el consentimiento específico',
    path: ['consentimientoPin'],
  })
  .refine((data) => !data.pinValor || Boolean(data.pinTipo), {
    message: 'Indica el tipo de PIN/patrón',
    path: ['pinTipo'],
  });

export type IngresoEquipoInput = z.infer<typeof ingresoEquipoSchema>;

export const asignarTecnicoSchema = z.object({
  reparacionId: z.string().uuid(),
  tecnicoId: z.string().uuid(),
});
