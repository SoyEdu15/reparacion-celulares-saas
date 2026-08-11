import { z } from 'zod';

const SUBDOMINIOS_RESERVADOS = new Set(['admin', 'www', 'api']);

export const crearTenantSchema = z.object({
  subdominio: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Mínimo 3 caracteres')
    .max(63)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones')
    .refine((s) => !SUBDOMINIOS_RESERVADOS.has(s), 'Ese subdominio está reservado'),
  nombreComercial: z.string().trim().min(2, 'Nombre muy corto').max(160),
  whatsappContactoSoporte: z.union([z.string().trim().max(20), z.literal('')]),
});
