/**
 * Los cortes de "hoy", "esta semana" y "este mes" se hacen en hora de
 * Colombia (UTC-5, sin horario de verano), no en la zona del servidor: si el
 * servidor corre en UTC, una venta de las 8 p. m. en Bogotá ya sería "mañana"
 * y aparecería en la caja del día siguiente.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** "2026-11-24" del día actual en Bogotá. */
export function hoyBogota(): string {
  return new Date(Date.now() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Instante UTC en que empieza el día `yyyy-mm-dd` en Bogotá. */
export function inicioDiaBogota(dia: string): Date {
  return new Date(`${dia}T05:00:00.000Z`);
}

/** Suma días a un `yyyy-mm-dd`. */
export function sumarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function esDiaValido(dia: string | undefined | null): dia is string {
  return !!dia && DIA_RE.test(dia) && !Number.isNaN(new Date(`${dia}T00:00:00Z`).getTime());
}

export type Periodo = 'hoy' | 'ayer' | 'semana' | 'mes' | 'mes-anterior' | 'rango';

/**
 * Devuelve el rango [desde, hasta) como instantes UTC y los días `yyyy-mm-dd`
 * inclusivos que lo forman (para mostrarlos y prellenar el formulario).
 */
export function rangoPeriodo(
  periodo: string | undefined,
  desdeParam?: string,
  hastaParam?: string,
): { periodo: Periodo; desdeDia: string; hastaDia: string; desde: Date; hasta: Date } {
  const hoy = hoyBogota();
  let desdeDia = hoy;
  let hastaDia = hoy;
  let p: Periodo = 'hoy';

  switch (periodo) {
    case 'ayer':
      p = 'ayer';
      desdeDia = hastaDia = sumarDias(hoy, -1);
      break;
    case 'semana': {
      p = 'semana';
      // Semana de lunes a hoy.
      const diaSemana = new Date(`${hoy}T00:00:00Z`).getUTCDay(); // 0 = domingo
      desdeDia = sumarDias(hoy, -((diaSemana + 6) % 7));
      break;
    }
    case 'mes':
      p = 'mes';
      desdeDia = `${hoy.slice(0, 7)}-01`;
      break;
    case 'mes-anterior': {
      p = 'mes-anterior';
      const primeroEste = `${hoy.slice(0, 7)}-01`;
      hastaDia = sumarDias(primeroEste, -1);
      desdeDia = `${hastaDia.slice(0, 7)}-01`;
      break;
    }
    case 'rango':
      if (esDiaValido(desdeParam) && esDiaValido(hastaParam)) {
        p = 'rango';
        desdeDia = desdeParam <= hastaParam ? desdeParam : hastaParam;
        hastaDia = desdeParam <= hastaParam ? hastaParam : desdeParam;
      }
      break;
  }

  return {
    periodo: p,
    desdeDia,
    hastaDia,
    desde: inicioDiaBogota(desdeDia),
    hasta: inicioDiaBogota(sumarDias(hastaDia, 1)),
  };
}

/** Convierte un instante a "yyyy-mm-dd" en Bogotá. */
export function diaBogota(fecha: Date): string {
  return new Date(fecha.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Para formularios donde se puede indicar la fecha de un movimiento (ej. un
 * gasto de ayer que se registra hoy): si es hoy se usa el instante actual, si
 * es otro día se ubica al mediodía de ese día en Bogotá.
 */
export function fechaMovimiento(dia: string | undefined | null): Date {
  if (!esDiaValido(dia) || dia === hoyBogota()) return new Date();
  return new Date(`${dia}T17:00:00.000Z`);
}
