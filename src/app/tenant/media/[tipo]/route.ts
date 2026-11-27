import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/tenant-auth';
import { getCurrentTenant } from '@/lib/tenant-context';
import { descargarFoto, descargarLogo } from '@/lib/storage/r2';

/**
 * Sirve fotos de equipos y logos a través de la propia app, en vez de mandar
 * al navegador una URL firmada del almacenamiento. Así funciona desde
 * cualquier dominio (también por un túnel hacia un servidor local, donde el
 * almacenamiento no es accesible desde afuera) y el permiso se revisa aquí:
 *  - logo: público, pero solo el logo vigente del taller de este dominio;
 *  - foto: solo con sesión iniciada en ese mismo taller.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const key = req.nextUrl.searchParams.get('k') ?? '';
  const tenant = await getCurrentTenant();
  if (!tenant || !key) return new NextResponse(null, { status: 404 });

  let archivo: { buffer: Buffer; contentType: string } | null = null;
  if (tipo === 'logo') {
    if (key !== tenant.logoUrl) return new NextResponse(null, { status: 404 });
    archivo = await descargarLogo(key);
  } else if (tipo === 'foto') {
    const session = await auth();
    if (!session?.user || session.user.tenantId !== tenant.id || !key.startsWith(`${tenant.id}/`)) {
      return new NextResponse(null, { status: 403 });
    }
    archivo = await descargarFoto(key);
  }
  if (!archivo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(archivo.buffer), {
    headers: {
      'Content-Type': archivo.contentType,
      'Cache-Control': tipo === 'logo' ? 'public, max-age=3600' : 'private, max-age=600',
    },
  });
}
