function csvEscape(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lineas = [headers.map(csvEscape).join(',')];
  for (const fila of rows) {
    lineas.push(fila.map(csvEscape).join(','));
  }
  // BOM para que Excel abra los acentos correctamente.
  return '﻿' + lineas.join('\r\n');
}

export function respuestaCsv(contenido: string, nombreArchivo: string): Response {
  return new Response(contenido, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  });
}
