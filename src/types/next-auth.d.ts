import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    tenantId: string;
    rol: 'DUENO' | 'TECNICO';
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      rol: 'DUENO' | 'TECNICO';
    } & DefaultSession['user'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string;
    tenantId: string;
    rol: 'DUENO' | 'TECNICO';
  }
}
