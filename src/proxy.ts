import { NextRequest, NextResponse } from 'next/server';

/**
 * Solo parsea el hostname y reescribe la ruta. Next.js 16 corre Proxy en
 * runtime Node.js por defecto, pero se mantiene liviano (sin Prisma/Redis)
 * a propósito: la resolución real del tenant (Paso 1 del login: ¿existe?,
 * ¿está activo?) pasa a app/tenant/layout.tsx, y el gate de sesión (Paso 2)
 * vive en app/tenant/(app)/layout.tsx vía auth(). Los Server Functions no
 * quedan cubiertos por el matcher de Proxy, así que la autorización real
 * nunca puede depender solo de esto — ver "Good to know" en la doc de Proxy.
 */
export function proxy(req: NextRequest) {
  const hostname = (req.headers.get('host') ?? '').split(':')[0] ?? '';
  const rootDomain = (process.env.PLATFORM_ROOT_DOMAIN ?? 'localhost:3000').split(':')[0];

  if (hostname === `admin.${rootDomain}`) {
    const url = req.nextUrl.clone();
    url.pathname = `/admin${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  const suffix = `.${rootDomain}`;
  if (hostname.endsWith(suffix)) {
    const subdominio = hostname.slice(0, -suffix.length);
    if (subdominio && !subdominio.includes('.')) {
      const url = req.nextUrl.clone();
      url.pathname = `/tenant${req.nextUrl.pathname}`;
      const res = NextResponse.rewrite(url);
      res.headers.set('x-tenant-subdominio', subdominio);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
