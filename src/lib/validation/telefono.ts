import { z } from 'zod';

/**
 * Único mercado que soporta esta plataforma por ahora (COP, NIT, Ley
 * 1581/2012 en el resto del código) — un prefijo fijo en vez de un
 * selector de país. El usuario nunca lo escribe, el sistema lo agrega.
 */
export const PREFIJO_PAIS = '+57';

const MENSAJE = 'El teléfono debe tener solo números, sin espacios ni letras (7 a 10 dígitos)';
const DIGITOS = /^[0-9]{7,10}$/;

/** Requerido: el input solo pide el número local, esto siempre devuelve "+57XXXXXXXXXX". */
export const telefonoSchema = z
  .string()
  .trim()
  .refine((v) => DIGITOS.test(v), { message: MENSAJE })
  .transform((v) => `${PREFIJO_PAIS}${v}`);

/** Nullable (ej. cliente del ingreso, solo obligatorio si no se eligió uno existente). */
export const telefonoNullableSchema = z
  .string()
  .trim()
  .nullable()
  .refine((v) => v === null || DIGITOS.test(v), { message: MENSAJE })
  .transform((v) => (v === null ? null : `${PREFIJO_PAIS}${v}`));

/** String vacío como "sin valor" (formularios que ya usan esa convención, ej. Configuración). */
export const telefonoOpcionalSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || DIGITOS.test(v), { message: MENSAJE })
  .transform((v) => (v === '' ? '' : `${PREFIJO_PAIS}${v}`));

/** Para precargar un input que solo pide el número local (sin el +57) al editar. */
export function quitarPrefijoPais(telefono: string | null | undefined): string {
  if (!telefono) return '';
  return telefono.startsWith(PREFIJO_PAIS) ? telefono.slice(PREFIJO_PAIS.length) : telefono;
}
