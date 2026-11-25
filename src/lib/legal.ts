import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Documentos legales de la plataforma. La fuente única son los .md de
 * docs/legal: estas páginas solo los leen, llenan las variables y los pintan.
 *
 * Al cambiar algo sustancial en los Términos, la Política de Privacidad o el
 * Acuerdo de Tratamiento de Datos, sube LEGAL_VERSION: el dueño de cada
 * taller tendrá que volver a aceptarlos en su próximo ingreso.
 */
export const LEGAL_VERSION = '1.0';
export const LEGAL_FECHA = '25 de noviembre de 2026';

export type SlugLegal = 'terminos' | 'privacidad' | 'tratamiento-datos' | 'sla' | 'cookies' | 'politica-datos';

export const DOCUMENTOS_LEGALES: Record<SlugLegal, { archivo: string; titulo: string; soloTaller?: boolean }> = {
  terminos: { archivo: 'terminos-y-condiciones.md', titulo: 'Términos y Condiciones' },
  privacidad: { archivo: 'politica-de-privacidad.md', titulo: 'Política de Privacidad' },
  'tratamiento-datos': { archivo: 'acuerdo-tratamiento-datos.md', titulo: 'Acuerdo de Tratamiento de Datos' },
  sla: { archivo: 'acuerdo-nivel-servicio.md', titulo: 'Acuerdo de Nivel de Servicio' },
  cookies: { archivo: 'politica-de-cookies.md', titulo: 'Política de Cookies' },
  'politica-datos': {
    archivo: 'plantilla-politica-datos-taller.md',
    titulo: 'Política de Tratamiento de Datos del taller',
    soloTaller: true,
  },
};

export function esSlugLegal(v: string): v is SlugLegal {
  return Object.prototype.hasOwnProperty.call(DOCUMENTOS_LEGALES, v);
}

export type DatosTaller = {
  nombreComercial: string | null;
  subdominio: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
};

/** Variables de la plataforma: vienen del entorno del servidor (ver docs/legal/README.md). */
function variablesPlataforma(): Record<string, string | undefined> {
  const e = process.env;
  return {
    PLATFORM_NAME: e.PLATFORM_NAME,
    PLATFORM_ROOT_DOMAIN: e.PLATFORM_ROOT_DOMAIN,
    PLATFORM_LEGAL_NAME: e.PLATFORM_LEGAL_NAME,
    PLATFORM_LEGAL_ID: e.PLATFORM_LEGAL_ID,
    PLATFORM_LEGAL_ADDRESS: e.PLATFORM_LEGAL_ADDRESS,
    PLATFORM_LEGAL_CITY: e.PLATFORM_LEGAL_CITY,
    PLATFORM_LEGAL_EMAIL: e.PLATFORM_LEGAL_EMAIL,
    PLATFORM_LEGAL_PHONE: e.PLATFORM_LEGAL_PHONE,
    LEGAL_PROVEEDOR_HOSTING: e.LEGAL_PROVEEDOR_HOSTING,
    LEGAL_UBICACION_HOSTING: e.LEGAL_UBICACION_HOSTING,
    LEGAL_PROVEEDOR_EMAIL: e.LEGAL_PROVEEDOR_EMAIL,
    LEGAL_UBICACION_EMAIL: e.LEGAL_UBICACION_EMAIL,
    LEGAL_VERSION,
    LEGAL_FECHA,
  };
}

function variablesTaller(t: DatosTaller): Record<string, string | undefined> {
  return {
    TALLER_NOMBRE: t.nombreComercial || t.subdominio,
    TALLER_NIT: t.nit ?? undefined,
    TALLER_DIRECCION: t.direccion ?? undefined,
    TALLER_TELEFONO: t.telefono ?? undefined,
  };
}

/** Marcador que sobrevive al escape de HTML y luego se vuelve el aviso amarillo de "pendiente". */
const PENDIENTE = (nombre: string) => `\u0000PENDIENTE:${nombre}\u0000`;

function llenar(texto: string, vars: Record<string, string | undefined>): string {
  return texto.replace(/\{\{([A-Z_]+)\}\}/g, (_, nombre: string) => {
    const v = vars[nombre];
    return v && v.trim() !== '' ? v.trim() : PENDIENTE(nombre);
  });
}

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Formato en línea sobre texto ya escapado: **negrita**, `código`, [enlace](url), <br>, pendientes. */
function enLinea(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(((?:\/|https?:\/\/|mailto:)[^)\s]*)\)/g, (_, texto: string, url: string) => {
      // Los enlaces a otros .md de la carpeta (README, checklist) no existen como página.
      if (/\.md$/.test(url)) return texto;
      const externo = /^https?:/.test(url);
      return `<a href="${url}"${externo ? ' target="_blank" rel="noreferrer"' : ''}>${texto}</a>`;
    })
    .replace(/&lt;br&gt;/g, '<br>')
    .replace(/\u0000PENDIENTE:([A-Z_]+)\u0000/g, '<mark class="legal-pendiente" title="Configura esta variable en el servidor">PENDIENTE: $1</mark>');
}

type Lista = { tipo: 'ul' | 'ol'; indent: number; html: string[] };

/**
 * Markdown mínimo → HTML. Todo el texto se escapa ANTES de aplicar formato,
 * así que ningún dato del taller (nombre, dirección...) puede inyectar HTML.
 */
export function markdownAHtml(md: string): string {
  const lineas = escapar(md).replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let parrafo: string[] = [];
  const pila: Lista[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length) out.push(`<p>${enLinea(parrafo.join(' '))}</p>`);
    parrafo = [];
  };
  const cerrarListasHasta = (indent: number) => {
    while (pila.length && pila[pila.length - 1]!.indent > indent) {
      const l = pila.pop()!;
      const html = `<${l.tipo}>${l.html.join('')}</li></${l.tipo}>`;
      if (pila.length) pila[pila.length - 1]!.html.push(html);
      else out.push(html);
    }
  };
  const cerrarTodo = () => {
    cerrarParrafo();
    cerrarListasHasta(-1);
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i] ?? '';
    const item = /^(\s*)(-|\d+\.)\s+(.*)$/.exec(linea);

    if (item) {
      cerrarParrafo();
      const indent = (item[1] ?? '').length;
      const tipo = item[2] === '-' ? 'ul' : 'ol';
      const contenido = (item[3] ?? '').replace(/^\[ \]\s*/, '☐ ');
      cerrarListasHasta(indent);
      const top = pila[pila.length - 1];
      if (top && top.indent === indent && top.tipo === tipo) {
        top.html.push(`</li><li>${enLinea(contenido)}`);
      } else {
        if (top && top.indent === indent) cerrarListasHasta(indent - 1);
        pila.push({ tipo, indent, html: [`<li>${enLinea(contenido)}`] });
      }
      continue;
    }

    // Texto indentado dentro de un ítem de lista: párrafo de continuación.
    if (pila.length && /^\s+\S/.test(linea)) {
      pila[pila.length - 1]!.html.push(`<p>${enLinea(linea.trim())}</p>`);
      continue;
    }

    if (linea.trim() === '') {
      cerrarParrafo();
      // Una línea en blanco no corta la lista si lo siguiente es su continuación.
      const sig = lineas[i + 1] ?? '';
      if (!(pila.length && /^\s+\S/.test(sig))) cerrarListasHasta(-1);
      continue;
    }

    cerrarListasHasta(-1);

    const titulo = /^(#{1,3})\s+(.*)$/.exec(linea);
    if (titulo) {
      cerrarParrafo();
      const n = (titulo[1] ?? '').length;
      out.push(`<h${n}>${enLinea(titulo[2] ?? '')}</h${n}>`);
      continue;
    }

    if (/^---+$/.test(linea.trim())) {
      cerrarParrafo();
      out.push('<hr>');
      continue;
    }

    if (linea.startsWith('&gt;')) {
      cerrarParrafo();
      const nota: string[] = [];
      while (i < lineas.length && (lineas[i] ?? '').startsWith('&gt;')) {
        nota.push((lineas[i] ?? '').replace(/^&gt;\s?/, ''));
        i++;
      }
      i--;
      out.push(`<blockquote>${enLinea(nota.join(' '))}</blockquote>`);
      continue;
    }

    if (linea.trim().startsWith('|')) {
      cerrarParrafo();
      const filas: string[][] = [];
      while (i < lineas.length && (lineas[i] ?? '').trim().startsWith('|')) {
        const celdas = (lineas[i] ?? '').trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!celdas.every((c) => /^:?-+:?$/.test(c))) filas.push(celdas);
        i++;
      }
      i--;
      const [cab = [], ...cuerpo] = filas;
      out.push(
        `<div class="tabla-scroll"><table class="data-table"><thead><tr>${cab.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead><tbody>${cuerpo
          .map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    parrafo.push(linea.trim());
  }
  cerrarTodo();
  return out.join('\n');
}

export async function leerDocumentoLegal(slug: SlugLegal, taller?: DatosTaller): Promise<string> {
  const doc = DOCUMENTOS_LEGALES[slug];
  const md = await readFile(path.join(process.cwd(), 'docs', 'legal', doc.archivo), 'utf8');
  const vars = { ...variablesPlataforma(), ...(taller ? variablesTaller(taller) : {}) };
  return markdownAHtml(llenar(md, vars));
}

/** ¿El dueño de este taller ya aceptó la versión vigente? */
export function terminosAlDia(tenant: { terminosVersionAceptada: string | null }): boolean {
  return tenant.terminosVersionAceptada === LEGAL_VERSION;
}
