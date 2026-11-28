import { NextRequest, NextResponse } from 'next/server';

/**
 * Solo parsea el hostname y reescribe la ruta. Next.js 16 corre Proxy en
 * runtime Node.js por defecto, pero se mantiene liviano (sin Prisma/Redis)
 * a propósito: la resolución real del tenant (Paso 1 del login: ¿existe?,
 * ¿está activo?) pasa a app/tenant/layout.tsx, y el gate de sesión (Paso 2)
 * vive en app/tenant/(app)/layout.tsx vía auth(). Los Server Functions no
 * quedan cubiertos por el matcher de Proxy, así que la autorización real
 * nunca puede depender solo de esto — ver "Good to know" en la doc de Proxy.
 *
 * Modo "dominio único": cuando la app se sirve desde un dominio que no es el
 * de la plataforma (por ejemplo un túnel gratuito tipo *.trycloudflare.com,
 * que no permite subdominios), el taller se elige con un enlace
 * `?taller=<subdominio>` y queda guardado en una cookie de ese navegador.
 * `?panel=admin` abre el panel de super-admin, pero SOLO desde este equipo.
 *
 * Seguridad:
 * - Las rutas internas `/admin/*` y `/tenant/*` nunca se sirven tal cual: solo
 *   se llega a ellas por la reescritura de abajo (si no, `/admin/login` quedaba
 *   abierto en cualquier dominio).
 * - El panel de super-admin no se publica: un pedido que llega por un túnel
 *   (con dominio que no es local, o con X-Forwarded-For, que agregan
 *   Cloudflare y Tailscale Funnel) nunca entra al panel. La app escucha solo en
 *   localhost, así que nadie de afuera puede saltarse el túnel para quitar
 *   esos encabezados.
 */
const COOKIE_TALLER = 'taller';
const PANEL_ADMIN = '__admin';

function reescribir(req: NextRequest, destino: 'tenant' | 'admin', subdominio?: string) {
  const url = req.nextUrl.clone();
  url.pathname = `/${destino}${req.nextUrl.pathname}`;
  const res = NextResponse.rewrite(url);
  if (subdominio) res.headers.set('x-tenant-subdominio', subdominio);
  return res;
}

const HOST_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)$/;

const IP_LOCAL = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/;

/**
 * true si el pedido NO viene directo de este equipo. Los túneles (Cloudflare,
 * Tailscale Funnel) usan su propio dominio y ponen en X-Forwarded-For la IP real
 * del visitante; Next.js solo agrega ahí la IP local (::1) en pedidos directos.
 * El Host también se revisa por si alguien lo falsifica dentro del túnel.
 */
function llegoPorTunel(req: NextRequest, hostname: string): boolean {
  const ips = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return (
    !HOST_LOCAL.test(hostname) ||
    ips.some((ip) => !IP_LOCAL.test(ip)) ||
    req.headers.has('cf-connecting-ip') ||
    req.headers.has('tailscale-funnel-request')
  );
}

function noEncontrado() {
  return new NextResponse('No encontrado', { status: 404 });
}

export function proxy(req: NextRequest) {
  const hostname = (req.headers.get('host') ?? '').split(':')[0] ?? '';
  const rootDomain = (process.env.PLATFORM_ROOT_DOMAIN ?? 'localhost:3000').split(':')[0];
  const externo = llegoPorTunel(req, hostname);
  const ruta = req.nextUrl.pathname;

  if (ruta === '/admin' || ruta.startsWith('/admin/') || ruta === '/tenant' || ruta.startsWith('/tenant/')) {
    return noEncontrado();
  }

  if (hostname === `admin.${rootDomain}`) {
    return externo ? noEncontrado() : reescribir(req, 'admin');
  }

  const suffix = `.${rootDomain}`;
  if (hostname.endsWith(suffix)) {
    const subdominio = hostname.slice(0, -suffix.length);
    if (subdominio && !subdominio.includes('.')) {
      return reescribir(req, 'tenant', subdominio);
    }
  }

  // Dominio raíz de la plataforma: página pública y documentos legales.
  if (hostname === rootDomain || hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  // ---- Modo dominio único (túnel) ----
  const pedido = req.nextUrl.searchParams.get('taller')?.toLowerCase().trim();
  const panel = externo ? null : req.nextUrl.searchParams.get('panel');
  if ((pedido && /^[a-z0-9-]{1,63}$/.test(pedido)) || panel === 'admin') {
    const limpia = req.nextUrl.clone();
    limpia.searchParams.delete('taller');
    limpia.searchParams.delete('panel');
    limpia.pathname = '/login';
    const res = NextResponse.redirect(limpia);
    res.cookies.set(COOKIE_TALLER, panel === 'admin' ? PANEL_ADMIN : pedido!, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  const elegido = req.cookies.get(COOKIE_TALLER)?.value;
  if (elegido === PANEL_ADMIN) return externo ? noEncontrado() : reescribir(req, 'admin');
  if (elegido && /^[a-z0-9-]{1,63}$/.test(elegido)) return reescribir(req, 'tenant', elegido);

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
