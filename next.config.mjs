/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
