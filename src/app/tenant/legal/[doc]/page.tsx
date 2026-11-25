import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant-context';
import { DOCUMENTOS_LEGALES, esSlugLegal, leerDocumentoLegal } from '@/lib/legal';
import { DocumentoLegal } from '@/components/legal/documento-legal';

/**
 * Documentos legales en el subdominio de un taller. Son públicos (no piden
 * sesión): el cliente final debe poder leer la política de datos del taller,
 * y el dueño los términos antes de aceptarlos.
 */
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  return { title: esSlugLegal(doc) ? DOCUMENTOS_LEGALES[doc].titulo : 'Documento legal' };
}

export default async function LegalTallerPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!esSlugLegal(doc)) notFound();
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const html = await leerDocumentoLegal(doc, tenant);
  return <DocumentoLegal slug={doc} html={html} conPoliticaTaller />;
}
