import { requireDueno } from '@/lib/auth/guards';
import { csvClientes } from '@/server/services/reportes';
import { respuestaCsv } from '@/lib/reportes/csv';

export async function GET() {
  const session = await requireDueno();
  const csv = await csvClientes(session.user.tenantId);
  return respuestaCsv(csv, 'clientes.csv');
}
