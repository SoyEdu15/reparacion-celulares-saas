import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function getRedis(): Redis {
  if (!globalThis.__redis) {
    globalThis.__redis = new Redis(process.env.REDIS_URL as string);
  }
  return globalThis.__redis;
}

/**
 * Contador de ventana fija en Redis. true = permitido, false = bloqueado.
 * Usado en login (ambos pasos) y endpoints públicos (sección 7). No es
 * pensado para runtime Edge — solo Node.js (route handlers, server actions).
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const redis = getRedis();
  const fullKey = `ratelimit:${key}`;
  const count = await redis.incr(fullKey);
  if (count === 1) {
    await redis.expire(fullKey, windowSeconds);
  }
  return count <= limit;
}
