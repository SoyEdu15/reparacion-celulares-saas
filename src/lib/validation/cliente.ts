import { z } from 'zod';
import { telefonoSchema } from './telefono';

export const clienteSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(160),
  telefono: telefonoSchema,
  cedula: z.union([z.string().trim().max(20), z.literal('')]),
  email: z.union([z.string().trim().toLowerCase().email('Email inválido'), z.literal('')]),
});

export const editarClienteSchema = clienteSchema.extend({
  id: z.string().uuid(),
});

export const buscarClienteSchema = z.object({
  q: z.string().trim().min(2).max(160),
});
