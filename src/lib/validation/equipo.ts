import { z } from 'zod';

export const equipoSchema = z.object({
  clienteId: z.string().uuid(),
  marca: z.string().trim().min(1, 'Requerido').max(60),
  modelo: z.string().trim().min(1, 'Requerido').max(60),
  color: z.union([z.string().trim().max(40), z.literal('')]),
  imei: z.union([z.string().trim().max(40), z.literal('')]),
});

export const editarEquipoSchema = equipoSchema.extend({
  id: z.string().uuid(),
});
