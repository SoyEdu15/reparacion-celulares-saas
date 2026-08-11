import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verify } from '@node-rs/argon2';
import { dbAdmin } from '@/lib/db';
import { withTenant } from '@/lib/rls';
import { checkRateLimit } from '@/lib/rate-limit';

function resolveSubdominio(host: string | null): string | null {
  const hostname = (host ?? '').split(':')[0] ?? '';
  const rootDomain = (process.env.PLATFORM_ROOT_DOMAIN ?? 'localhost:3000').split(':')[0];
  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const subdominio = hostname.slice(0, -suffix.length);
  return subdominio && !subdominio.includes('.') ? subdominio : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: 'tenant-session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (credentials, request) => {
        // El tenant NUNCA sale de `credentials` (eso vendría del cliente).
        // Se re-deriva del Host de la request, igual que en el middleware —
        // es la misma resolución del Paso 1, hecha de nuevo del lado del
        // servidor para no confiar en nada que haya viajado desde el form.
        const subdominio = resolveSubdominio(request.headers.get('host'));
        if (!subdominio) return null;

        const tenant = await dbAdmin.tenant.findUnique({ where: { subdominio } });
        if (!tenant || tenant.estado !== 'ACTIVO') return null;

        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase().trim() : null;
        const password = typeof credentials?.password === 'string' ? credentials.password : null;
        if (!email || !password) return null;

        const rateLimitKey = `login:${tenant.id}:${email}`;
        const allowed = await checkRateLimit(rateLimitKey, 5, 300);
        if (!allowed) return null;

        const usuario = await withTenant(tenant.id, (tx) =>
          tx.usuario.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } }),
        );
        if (!usuario || !usuario.activo) return null;

        const valid = await verify(usuario.passwordHash, password);
        if (!valid) return null;

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          tenantId: usuario.tenantId,
          rol: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id as string;
        token.tenantId = user.tenantId;
        token.rol = user.rol;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.rol = token.rol;
      return session;
    },
  },
});
