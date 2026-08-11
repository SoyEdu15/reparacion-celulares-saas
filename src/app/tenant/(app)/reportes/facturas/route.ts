import { requireDueno } from '@/lib/auth/guards';
import { csvFacturas } from '@/server/services/reportes';
import { respuestaCsv } from '@/lib/reportes/csv';

export async function GET() {
  const session = await requireDueno();
  const csv = await csvFacturas(session.user.tenantId);
  return respuestaCsv(csv, 'facturas.csv');
}
