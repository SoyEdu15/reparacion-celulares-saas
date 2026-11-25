import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DOCUMENTOS_LEGALES, esSlugLegal, leerDocumentoLegal } from '@/lib/legal';
import { DocumentoLegal } from '@/components/legal/documento-legal';

/** Documentos legales en el dominio raíz de la plataforma (sin taller). */
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  return { title: esSlugLegal(doc) ? DOCUMENTOS_LEGALES[doc].titulo : 'Documento legal' };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!esSlugLegal(doc) || DOCUMENTOS_LEGALES[doc].soloTaller) notFound();
  const html = await leerDocumentoLegal(doc);
  return <DocumentoLegal slug={doc} html={html} />;
}
