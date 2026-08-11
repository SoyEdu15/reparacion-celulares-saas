import { z } from 'zod';

export const clienteSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(160),
  telefono: z.string().trim().min(7, 'Teléfono inválido').max(20),
  cedula: z.union([z.string().trim().max(20), z.literal('')]),
  email: z.union([z.string().trim().toLowerCase().email('Email inválido'), z.literal('')]),
});

export const editarClienteSchema = clienteSchema.extend({
  id: z.string().uuid(),
});

export const buscarClienteSchema = z.object({
  q: z.string().trim().min(2).max(160),
});
