import { DOCUMENTOS_LEGALES, type SlugLegal } from '@/lib/legal';

const ENLACES: SlugLegal[] = ['terminos', 'privacidad', 'tratamiento-datos', 'sla', 'cookies'];

/**
 * Página pública de un documento legal. El HTML viene de markdownAHtml(),
 * que escapa todo el texto antes de darle formato.
 */
export function DocumentoLegal({
  slug,
  html,
  conPoliticaTaller,
}: {
  slug: SlugLegal;
  html: string;
  conPoliticaTaller?: boolean;
}) {
  const enlaces: SlugLegal[] = conPoliticaTaller ? [...ENLACES, 'politica-datos'] : ENLACES;
  return (
    <main className="legal-pagina">
      <nav className="legal-nav" aria-label="Documentos legales">
        {enlaces.map((s) => (
          <a key={s} href={`/legal/${s}`} aria-current={s === slug ? 'page' : undefined}>
            {DOCUMENTOS_LEGALES[s].titulo}
          </a>
        ))}
      </nav>
      <article className="legal-doc" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
