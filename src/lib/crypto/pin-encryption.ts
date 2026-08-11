import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.PIN_ENCRYPTION_KEY;
  if (!key) throw new Error('PIN_ENCRYPTION_KEY no configurada');
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) throw new Error('PIN_ENCRYPTION_KEY debe decodificar a 32 bytes');
  return buf;
}

/**
 * Cifrado del PIN/patrón (sección 7.1): clave independiente del resto de
 * la base de datos, nunca reversible con un query SQL simple. Formato
 * guardado: "iv.authTag.ciphertext" en base64.
 */
export function encryptPin(valor: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(valor, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptPin(valorCifrado: string): string {
  const [ivB64, authTagB64, dataB64] = valorCifrado.split('.');
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Formato de PIN cifrado inválido');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
