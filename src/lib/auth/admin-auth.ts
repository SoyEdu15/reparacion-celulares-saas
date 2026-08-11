import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verify } from '@node-rs/argon2';
import { dbAdmin } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Instancia separada de la de tenant-auth.ts: secreto distinto
 * (AUTH_ADMIN_SECRET) y cookie distinta ("admin-session-token"), para que
 * una sesión de super-admin y una de tenant nunca puedan confundirse ni
 * compartir firma. dbAdmin (BYPASSRLS) es correcto acá porque super_admins
 * no es una tabla de tenant — de hecho app_tenant no tiene ni permisos
 * sobre ella (ver migración de RLS).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_ADMIN_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: 'admin-session-token',
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
      authorize: async (credentials) => {
        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase().trim() : null;
        const password = typeof credentials?.password === 'string' ? credentials.password : null;
        if (!email || !password) return null;

        const allowed = await checkRateLimit(`login:admin:${email}`, 5, 300);
        if (!allowed) return null;

        const superAdmin = await dbAdmin.superAdmin.findUnique({ where: { email } });
        if (!superAdmin || !superAdmin.activo) return null;

        const valid = await verify(superAdmin.passwordHash, password);
        if (!valid) return null;

        // La aumentación de tipos de next-auth (src/types/next-auth.d.ts) exige
        // tenantId/rol porque está pensada para la sesión de tenant-auth.ts;
        // una sesión de super-admin nunca los tiene ni los usa.
        return { id: superAdmin.id, name: superAdmin.nombre, email: superAdmin.email } as User;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.superAdminId = user.id as string;
      }
      return token;
    },
    session: async ({ session, token }) => {
      (session as typeof session & { superAdminId: string }).superAdminId = token.superAdminId as string;
      return session;
    },
  },
});
