import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

// MinIO en local, Cloudflare R2 en producción — misma interfaz S3, solo
// cambian las variables de entorno (STORAGE_ENDPOINT/credenciales).
const client = new S3Client({
  region: process.env.STORAGE_REGION ?? 'auto',
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY as string,
  },
});

const BUCKET_FOTOS = process.env.STORAGE_BUCKET_FOTOS as string;

const CONTENT_TYPES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSION_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function buildFotoKey(tenantId: string, reparacionId: string, contentType: string): string {
  const ext = EXTENSION_POR_TIPO[contentType] ?? 'bin';
  return `${tenantId}/${reparacionId}/${randomUUID()}.${ext}`;
}

/**
 * URL firmada de subida (PUT), corta duración (sección 7: "URLs firmadas
 * con expiración corta"; bucket nunca público). El navegador sube el
 * binario directo a R2/MinIO — el archivo nunca pasa por el servidor de
 * Next.js.
 */
export async function presignFotoUpload(key: string, contentType: string): Promise<string> {
  if (!CONTENT_TYPES_PERMITIDOS.has(contentType)) {
    throw new Error(`Tipo de archivo no permitido: ${contentType}`);
  }
  const command = new PutObjectCommand({ Bucket: BUCKET_FOTOS, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

/** URL firmada de lectura (GET), corta duración — se genera al vuelo para previsualizar. */
export async function presignFotoView(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET_FOTOS, Key: key });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

/**
 * Sube el archivo desde el servidor (Server Action recibe el File
 * directamente en el FormData). Más simple que URLs firmadas de subida
 * para el MVP; el bucket sigue siendo privado y la lectura sigue yendo
 * por presignFotoView. Migrar a subida directa navegador→R2 es un cambio
 * aislado a este archivo si hace falta más adelante por volumen.
 */
export async function uploadFoto(tenantId: string, reparacionId: string, file: File): Promise<string> {
  if (!CONTENT_TYPES_PERMITIDOS.has(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}`);
  }
  const key = buildFotoKey(tenantId, reparacionId, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());
  await client.send(new PutObjectCommand({ Bucket: BUCKET_FOTOS, Key: key, Body: buffer, ContentType: file.type }));
  return key;
}
