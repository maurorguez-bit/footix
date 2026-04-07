/**
 * PRESEASON SERVICE
 * Handles friendly matches, cantera generation, and squad preparation.
 */

import { v4 as uuidv4 } from 'uuid';
import type { GameState, Club, Friendly, CanteraPlayer } from '../../../shared/types/index';
import { simulateMatch } from './engine';
import { generatePlayer } from '../utils/dataGenerator';
import { autoSelectLineup } from '../services/gameService';

const rnd  = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── Generate 4 friendly options ───────────────────────────────

export function generateFriendlyOptions(state: GameState): Friendly[] {
  const club       = state.liga.find(c => c.id === state.clubId)!;
  const candidates = state.liga.filter(c => c.id !== state.clubId);

  // Mix of easy, medium and hard rivals
  const sorted = [...candidates].sort((a, b) => {
    const avgA = a.plantilla.slice(0, 11).reduce((s, p) => s + p.media, 0) / 11;
    const avgB = b.plantilla.slice(0, 11).reduce((s, p) => s + p.media, 0) / 11;
    return avgA - avgB;
  });

  const n     = sorted.length;
  const easy  = sorted[Math.floor(n * 0.15)];
  const med1  = sorted[Math.floor(n * 0.4)];
  const med2  = sorted[Math.floor(n * 0.6)];
  const hard  = sorted[Math.floor(n * 0.85)];

  return [easy, med1, med2, hard].filter(Boolean).map(rival => ({
    id:          uuidv4(),
    rivalId:     rival.id,
    rivalNombre: rival.nombre,
    jugado:      false,
  }));
}

// ── Simulate a friendly ───────────────────────────────────────

export function playFriendly(
  state: GameState,
  friendlyId: string,
): { state: GameState; resultado: { gL: number; gV: number }; fullResult: ReturnType<typeof simulateMatch> } {
  const friendly = state.amistosos.find(f => f.id === friendlyId);
  if (!friendly || friendly.jugado) throw new Error('Amistoso no disponible');

  const myClub = state.liga.find(c => c.id === state.clubId)!;
  const rival  = state.liga.find(c => c.id === friendly.rivalId)!;

  const result = simulateMatch({
    local: myClub, visitante: rival,
    myClubId: state.clubId,
    myAlineacion: state.alineacion,
    tactica: state.tactica,
    jornada: 0,
  });
  result.esAmistoso = true;

  // Mark as played
  friendly.jugado   = true;
  friendly.resultado = { gL: result.golesLocal, gV: result.golesVisitante };
  state.amistososJugados = (state.amistososJugados || 0) + 1;

  // Apply ratings and fitness changes (lighter than league)
  myClub.plantilla.forEach(p => {
    if (state.alineacion.slice(0, 11).includes(p.id)) {
      p.partidos++;
      p.fatiga    = Math.min(100, (p.fatiga || 0) + rnd(4, 8));
      p.fisico    = Math.min(100, p.fisico + rnd(1, 4)); // fitness improves in preseason
    }
  });

  // XP for staff
  const entrenador = myClub.staff.find(s => s.rol === 'entrenador');
  if (entrenador) entrenador.xp = (entrenador.xp || 0) + 15;

  // Recalc auto lineup
  state.alineacion = autoSelectLineup(myClub, state.tactica.sistema);

  return { state, resultado: { gL: result.golesLocal, gV: result.golesVisitante }, fullResult: result };
}

// ── Generate cantera players ──────────────────────────────────

const YOUTH_NAMES = {
  nombres:   ['Pablo','Iker','Marcos','Adrián','Diego','Hugo','Carlos','Sergio','Álvaro','Daniel','Mario','Rubén','Víctor','Samuel','Eduardo'],
  apellidos: ['García','López','Martínez','Sánchez','Pérez','González','Hernández','Jiménez','Ruiz','Díaz','Moreno','Torres','Domínguez','Vázquez','Ramos'],
};

const usedYouthNames = new Set<string>();

function youthName(): { nombre: string; apellido: string } {
  let attempts = 0;
  while (attempts < 30) {
    const nombre   = pick(YOUTH_NAMES.nombres);
    const apellido = pick(YOUTH_NAMES.apellidos);
    const full     = `${nombre} ${apellido}`;
    if (!usedYouthNames.has(full)) {
      usedYouthNames.add(full);
      return { nombre, apellido };
    }
    attempts++;
  }
  const nombre   = pick(YOUTH_NAMES.nombres);
  const apellido = pick(YOUTH_NAMES.apellidos) + rnd(10, 99);
  return { nombre, apellido };
}

export function generateCantera(div: number, ojeadorLevel: number): CanteraPlayer[] {
  const count    = 3 + Math.floor(ojeadorLevel / 2); // more players with better ojeador
  const players: CanteraPlayer[] = [];

  for (let i = 0; i < count; i++) {
    const { nombre, apellido } = youthName();
    const edad       = rnd(15, 18);
    const potencial  = div === 0 ? rnd(72, 90) : div === 1 ? rnd(65, 82) : rnd(55, 75);
    const pos        = pick(['POR','DEF','DEF','MED','MED','DEL'] as any[]);

    players.push({
      id:                   uuidv4(),
      nombre, apellido, edad, pos, potencial,
      descubierto:          ojeadorLevel >= 3 ? Math.random() < 0.6 : Math.random() < 0.3,
      jornadasDesarrollo:   0,
    });
  }

  return players;
}

// ── Season summary builder ────────────────────────────────────

export function buildSeasonSummary(state: GameState): import('../../../shared/types/index').SeasonSummary {
  const club      = state.liga.find(c => c.id === state.clubId)!;
  const divStandings = state.liga
    .filter(c => c.div === club.div)
    .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));

  const posicion = divStandings.findIndex(c => c.id === state.clubId) + 1;

  const obj = club.objetivo;
  const objetivoCumplido =
    (obj === 'Campeón'      && posicion === 1)  ||
    (obj === 'Top 8'        && posicion <= 8)   ||
    (obj === 'Media tabla'  && posicion <= 12)  ||
    (obj === 'Salvación'    && posicion <= 16)  ||
    (obj === 'Ascenso'      && posicion <= 2);

  // Top scorer this season
  const allPlayers = state.liga.filter(c => c.div === club.div).flatMap(c => c.plantilla);
  const topScorer  = allPlayers.sort((a, b) => b.goles - a.goles)[0];

  // MVP: highest avg rating in my club
  const mvp = club.plantilla.sort((a, b) => b.notaMedia - a.notaMedia)[0];

  // F6-3: estadísticas de temporada enriquecidas
  const fichajes = (state.historialTransferencias ?? [])
    .filter(t => t.temporada === state.temporada && t.kind === 'alta').length;
  const ventas   = (state.historialTransferencias ?? [])
    .filter(t => t.temporada === state.temporada && (t.kind === 'baja' || t.kind === 'cesion')).length;

  return {
    temporada:           state.temporada,
    clubNombre:          club.nombre,
    division:            club.div,
    posicion,
    pts:   club.pts,
    pg:    club.pg,
    pe:    club.pe,
    pp:    club.pp,
    gf:    club.gf,
    gc:    club.gc,
    objetivoCumplido,
    titulo:              posicion === 1,
    mvpTemporada: mvp ? `${mvp.nombre} ${mvp.apellido}` : undefined,
    maxGoleador:  topScorer ? { nombre: `${topScorer.nombre} ${topScorer.apellido}`, goles: topScorer.goles } : undefined,
    presupuestoFinal:    club.presupuesto,
    presupuestoInicio:   state.presupuestoInicioTemporada ?? club.presupuesto,
    fichajes,
    ventas,
    repManager:          state.repManager,
  };
}
