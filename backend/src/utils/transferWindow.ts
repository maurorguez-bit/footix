/**
 * TRANSFER WINDOW UTILITY
 * Single source of truth for all transfer window logic.
 *
 * Rules:
 *  - Ventana de verano:   pretemporada + jornadas 1 y 2 de liga
 *  - Ventana de invierno: 4 jornadas centradas en jornadaInvierno
 *                         (jornadaInvierno - 1 ... jornadaInvierno + 2)
 *  - Fuera de ventana:    NADIE puede comprar ni vender (ni usuario ni IA)
 */

import type { GameState } from '../../../shared/types/index';

export interface WindowInfo {
  abierta: boolean;
  tipo: 'verano' | 'invierno' | 'cerrada';
  /** jornada en la que abre la siguiente ventana, undefined si es la última */
  proximaApertura?: number;
  /** jornada en la que cierra la ventana actual */
  cierraEn?: number;
  /** días/jornadas restantes en la ventana actual */
  jornadasRestantes?: number;
  mensaje: string;
}

export function getTransferWindow(state: GameState): WindowInfo {
  const { fase, jornada, jornadaInvierno } = state;

  // ── Ventana de verano ─────────────────────────────────────────
  // Pretemporada siempre abierta
  if (fase === 'pretemporada' || fase === 'amistosos') {
    return {
      abierta: true,
      tipo: 'verano',
      cierraEn: 2, // cierra tras jornada 2
      mensaje: '☀️ Mercado de verano abierto — puedes fichar, vender y ceder',
    };
  }

  // Jornadas 1 y 2 de liga = ventana de verano aún abierta
  if (fase === 'liga' && jornada <= 3) {
    const restantes = 3 - jornada;
    return {
      abierta: true,
      tipo: 'verano',
      cierraEn: 2,
      jornadasRestantes: restantes,
      mensaje: `☀️ Ventana de verano · Cierra en ${restantes} jornada${restantes !== 1 ? 's' : ''}`,
    };
  }

  // ── Ventana de invierno ───────────────────────────────────────
  // 4 jornadas: desde jornadaInvierno-1 hasta jornadaInvierno+2 (inclusive)
  const inviernoStart = jornadaInvierno - 1;
  const inviernoEnd   = jornadaInvierno + 2;

  if (fase === 'mercadoInvierno' || (fase === 'liga' && jornada >= inviernoStart && jornada <= inviernoEnd)) {
    const restantes = inviernoEnd - jornada + 1;
    return {
      abierta: true,
      tipo: 'invierno',
      cierraEn: inviernoEnd,
      jornadasRestantes: Math.max(0, restantes),
      mensaje: `❄️ Ventana de invierno · Cierra en ${Math.max(0, restantes)} jornada${restantes !== 1 ? 's' : ''}`,
    };
  }

  // ── Cerrada ───────────────────────────────────────────────────
  // Calcular cuándo abre la próxima
  let proximaApertura: number | undefined;
  if (fase === 'liga') {
    if (jornada < inviernoStart) {
      proximaApertura = inviernoStart;
    }
    // Si ya pasó el invierno no hay más ventanas esta temporada
  }

  const jornadasParaApertura = proximaApertura ? proximaApertura - jornada : undefined;

  return {
    abierta: false,
    tipo: 'cerrada',
    proximaApertura,
    mensaje: proximaApertura
      ? `🔒 Mercado cerrado · Abre en ${jornadasParaApertura} jornada${jornadasParaApertura !== 1 ? 's' : ''} (J${proximaApertura})`
      : '🔒 Mercado cerrado hasta la próxima pretemporada',
  };
}

/** Shorthand: returns true if any transfer is allowed right now */
export function isWindowOpen(state: GameState): boolean {
  return getTransferWindow(state).abierta;
}

/** Error message to return when window is closed */
export function windowClosedError(state: GameState): string {
  return getTransferWindow(state).mensaje;
}
