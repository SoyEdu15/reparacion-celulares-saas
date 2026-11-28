const produccion = process.env.NODE_ENV === 'production';

// Encabezados de seguridad para todas las páginas:
// - nadie puede meter la app dentro de otra página (clickjacking);
// - el navegador no "adivina" tipos de archivo;
// - solo se cargan scripts, estilos e imágenes de la propia app;
// - en HTTPS el navegador recuerda usar siempre HTTPS.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${produccion ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${produccion ? '' : ' ws: wss:'}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const encabezadosSeguridad = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(produccion ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: encabezadosSeguridad }];
  },
  // Los documentos legales se leen en runtime desde docs/legal (ver src/lib/legal.ts).
  outputFileTracingIncludes: {
    '/**': ['./docs/legal/**/*'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
