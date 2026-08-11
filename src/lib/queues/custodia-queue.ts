import { Queue } from 'bullmq';
import { getQueueConnection } from './connection';

declare global {
  // eslint-disable-next-line no-var
  var __custodiaQueue: Queue | undefined;
}

function getQueue(): Queue {
  if (!globalThis.__custodiaQueue) {
    globalThis.__custodiaQueue = new Queue('custodia', { connection: getQueueConnection() });
  }
  return globalThis.__custodiaQueue;
}

/**
 * upsertJobScheduler con un id fijo: llamar esto más de una vez (ej. cada
 * reinicio del worker) actualiza el mismo scheduler en vez de duplicarlo.
 */
export async function programarJobCustodiaDiario(): Promise<void> {
  await getQueue().upsertJobScheduler(
    'custodia-diaria',
    { pattern: '0 8 * * *' },
    { name: 'procesar' },
  );
}
