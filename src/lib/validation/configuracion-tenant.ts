import { z } from 'zod';
import { telefonoOpcionalSchema } from './telefono';

export const configuracionTenantSchema = z.object({
  nombreComercial: z.string().trim().min(2, 'Nombre muy corto').max(160),
  nit: z.union([z.string().trim().max(30), z.literal('')]),
  direccion: z.union([z.string().trim().max(200), z.literal('')]),
  telefono: telefonoOpcionalSchema,

  piePaginaFactura: z.union([z.string().trim().max(500), z.literal('')]),
  remitenteEmailFacturas: z.union([z.string().trim().toLowerCase().email('Email inválido'), z.literal('')]),
  plantillaFacturaDefault: z.enum(['CLASICA', 'MODERNA', 'MINIMALISTA']),
  formatoFacturaDefault: z.enum(['TERMICO_58MM', 'TERMICO_80MM', 'CARTA_A4']),

  diasCustodiaGratis: z.number().int().min(0).max(365),
  tarifaBodegajeDiaria: z.number().int().min(0),
  intervaloRecordatorioDias: z.number().int().min(1).max(90),
  diasLimiteAbandono: z.number().int().min(1).max(3650),

  garantiaActiva: z.boolean(),
  diasGarantiaDefault: z.number().int().min(0).max(3650),

  diasPurgaPin: z.number().int().min(1).max(3650).nullable(),

  whatsappActivo: z.boolean(),
  emailActivo: z.boolean(),
});

export type ConfiguracionTenantInput = z.infer<typeof configuracionTenantSchema>;
