import { requireDueno } from '@/lib/auth/guards';
import { csvReparaciones } from '@/server/services/reportes';
import { respuestaCsv } from '@/lib/reportes/csv';

export async function GET() {
  const session = await requireDueno();
  const csv = await csvReparaciones(session.user.tenantId);
  return respuestaCsv(csv, 'reparaciones.csv');
}
