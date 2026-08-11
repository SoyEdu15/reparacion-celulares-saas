import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var __bullRedis: Redis | undefined;
}

/** BullMQ exige maxRetriesPerRequest: null en la conexión que usan sus workers/colas. */
export function getQueueConnection(): Redis {
  if (!globalThis.__bullRedis) {
    globalThis.__bullRedis = new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: null,
    });
  }
  return globalThis.__bullRedis;
}
