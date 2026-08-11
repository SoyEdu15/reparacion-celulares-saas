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
  duenoNombre: z.string().trim().min(2, 'Nombre muy corto').max(120),
  duenoEmail: z.string().trim().toLowerCase().email('Email inválido'),
  duenoPassword: z.string().min(8, 'Mínimo 8 caracteres').max(200),
});

export const crearDuenoSchema = z.object({
  tenantId: z.string().uuid(),
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(200),
});
