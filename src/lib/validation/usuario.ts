import { z } from 'zod';

export const crearTecnicoSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(200),
});

export const editarTecnicoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.union([z.string().min(8).max(200), z.literal('')]),
});

export const toggleActivoSchema = z.object({
  id: z.string().uuid(),
  activo: z.boolean(),
});
