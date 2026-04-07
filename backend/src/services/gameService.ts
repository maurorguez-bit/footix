/**
 * GAME SERVICE
 * Manages GameState creation, saving, loading and season progression.
 */

import { v4 as uuidv4 } from 'uuid';
import type { GameState, Club, Player } from '../../../shared/types/index';
import { generateLeague, generateFreeMarket } from '../utils/dataGenerator';
import { generateCalendar } from '../utils/calendar';
import { endOfSeasonProgression } from '../simulation/engine';

// ── Works definition ─────────────────────────────────────────

export const WORKS_DEF: Record<string, {
  label: string; cost: number; jornadas: number;
  apply: (club: Club) => void;
}> = {
  aforo5:   { label:'+5.000 plazas',       cost:1_500_000, jornadas:2, apply:(c)=>{ c.stadium.capacidad = Math.min(90000, c.stadium.capacidad+5000); } },
  aforo15:  { label:'+15.000 plazas',      cost:4_000_000, jornadas:5, apply:(c)=>{ c.stadium.capacidad = Math.min(90000, c.stadium.capacidad+15000); } },
  aforo30:  { label:'+30.000 plazas',      cost:9_000_000, jornadas:9, apply:(c)=>{ c.stadium.capacidad = Math.min(90000, c.stadium.capacidad+30000); } },
  tienda:   { label:'Tienda',              cost:500_000,   jornadas:2, apply:(c)=>{ c.stadium.tienda = true; } },
  parking:  { label:'Parking',             cost:800_000,   jornadas:2, apply:(c)=>{ c.stadium.parking = true; } },
  inst:     { label:'Instalaciones',       cost:1_000_000, jornadas:3, apply:(c)=>{ c.stadium.instalaciones = Math.min(10, c.stadium.instalaciones+1); } },
  bar:      { label:'Bar mejorado',        cost:300_000,   jornadas:1, apply:(c)=>{ c.stadium.bar_precio = Math.min(12, c.stadium.bar_precio+1); } },
  vestuarios:{ label:'Vestuarios',         cost:700_000,   jornadas:2, apply:(c)=>{ c.stadium.vestuarios = Math.min(5, (c.stadium.vestuarios||1)+1); } },
};

// ── Sponsors ──────────────────────────────────────────────────

export const SPONSORS = [
  { id:'local',    nombre:'Distribuciones García',  mult:0.5,  repMin:0,  desc:'Empresa local. Ingreso mínimo garantizado.',   icon:'🏪' },  // F7-2: penalización real
  { id:'regional', nombre:'Grupo Inversiones Norte', mult:1.0,  repMin:30, desc:'Cobertura regional. Equilibrado.',             icon:'🏢' },
  { id:'nacional', nombre:'Telecom España',          mult:1.5,  repMin:55, desc:'Marca nacional. Exige rendimiento.',           icon:'📡' },
  { id:'inter',    nombre:'SportMax International',  mult:2.2,  repMin:75, desc:'Multinacional. Alto riesgo y beneficio.',      icon:'🌍' },
  { id:'premier',  nombre:'GlobalBank Premium',      mult:3.5,  repMin:90, desc:'Élite. Solo para los mejores.',               icon:'💎' },
];

// ── New Game ──────────────────────────────────────────────────

export async function createNewGame(
  modo: 'manager' | 'carrera',
  clubNombre: string,
  nombreManager: string,
): GameState {
  const liga = generateLeague();
  const club = liga.find(c => c.nombre === clubNombre);
  if (!club) throw new Error(`Club no encontrado: ${clubNombre}`);

  const divClubs = liga.filter(c => c.div === club.div);
  const calendario = generateCalendar(divClubs.map(c => c.id));
  const jornadaInvierno = Math.floor(calendario.length / 2);

  // Generate cantera for my club
  const ojeador = club.staff.find(s => s.rol === 'ojeador');
  const { generateCantera } = await import('../simulation/preseason');
  club.cantera = generateCantera(club.div, ojeador?.nivel ?? 2);

  // Generate friendly options
  const { generateFriendlyOptions } = await import('../simulation/preseason');
  const tempState: any = { liga, clubId: club.id, amistosos: [], amistososJugados: 0 };
  const amistosos = generateFriendlyOptions(tempState as any);

  return {
    saveId: uuidv4(),
    modo,
    temporada: 1,
    jornada: 1,
    fase: 'pretemporada',
    clubId: club.id,
    liga,
    calendario,
    resultados: [],
    jornadaInvierno,
    amistosos,
    amistososJugados: 0,
    mercadoLibre: generateFreeMarket(),
    transferencias: [],
    ultimasBajas: [],
    ultimasFichas: [],
    informesScouting: [],
    repManager: modo === 'carrera' ? 20 : 50,
    nombreManager,
    experienciaManager: 0,
    tactica: { sistema: '4-4-2', enfoque: 'equilibrado' },
    alineacion: autoSelectLineup(club, '4-4-2'),
    patrocinadorFirmado: false,
    eventosActivos: [],
    eventosResueltos: [],
    trivialJornada: 0,
    trivialUsadas: [],
    xpManager: 0,
    lootBoxes: [],
    historialTemporadas: [],
    temporadaTerminada: false,
    liveMatchActive: false,
    jornadasEnDeficit: 0,
    bloqueadoPorDeuda: false,
    advertenciaDirectiva: false,
    historialResultados: [],
    historialTransferencias: [],
    recomendacionesPostPartido: [],
    scoutRequests: [],
    promesasMinutos: [],
    presupuestoInicioTemporada: club.presupuesto,
  };
}

// ── Auto lineup ───────────────────────────────────────────────

export function autoSelectLineup(club: Club, sistema: string): string[] {
  const [nd, nm, na] = sistema.split('-').map(Number);
  const avail = (pos: string) =>
    club.plantilla
      .filter(p => p.pos === pos && !p.lesionado && !p.tarjetas_rojas && !p.convocado)
      .sort((a, b) => b.media - a.media);

  const titulares = [
    ...avail('POR').slice(0, 1),
    ...avail('DEF').slice(0, nd),
    ...avail('MED').slice(0, nm),
    ...avail('DEL').slice(0, na),
  ].map(p => p.id);

  const used = new Set(titulares);
  const suplentes = club.plantilla
    .filter(p => !used.has(p.id) && !p.lesionado)
    .sort((a, b) => b.media - a.media)
    .slice(0, 7)
    .map(p => p.id);

  return [...titulares, ...suplentes];
}

// ── Apply jornada finances ────────────────────────────────────

export function applyJornadaFinances(club: Club, golesL: number, golesC: number, isHome: boolean, jornadasTotal: number): void {
  // Match day income (home games only)
  if (isHome) {
    // F2-2: precio de entradas afecta asistencia
    // Precio óptimo: 30€ para rep media. Por encima reduce asistencia, por debajo la aumenta.
    const precioOptimo = 20 + club.rep * 0.5; // entre 20€ (rep 0) y 70€ (rep 100)
    const precioMult   = Math.max(0.5, Math.min(1.2, precioOptimo / Math.max(1, club.stadium.entradas_precio)));
    const ocupacion    = Math.min(1, (0.5 + club.rep / 200 + (golesL > golesC ? 0.05 : 0)) * precioMult);
    const asistencia   = Math.round(club.stadium.capacidad * ocupacion);
    club.presupuesto  += asistencia * club.stadium.entradas_precio;

    // Bar revenue
    if (club.stadium.bar) {
      club.presupuesto += Math.round(asistencia * 0.25 * club.stadium.bar_precio);  // F7-2: 25% realista
    }

    // Shop revenue
    if (club.stadium.tienda) {
      club.presupuesto += Math.round(asistencia * 0.15 * 8 * club.stadium.tienda_revenue_mult);
    }

    // Parking
    if (club.stadium.parking) {
      club.presupuesto += Math.round(asistencia * 0.2 * 5);
    }
  }

  // Patrocinio (split across all jornadas) — guard NaN
  const patrocinio = isNaN(club.patrocinio) ? 0 : (club.patrocinio ?? 0);
  club.presupuesto += Math.round(patrocinio / Math.max(1, jornadasTotal));

  // Wage bill (every jornada regardless of home/away)
  const weeklyWages = club.plantilla.reduce((s, p) => s + p.salario, 0);
  const staffWages  = club.staff.reduce((s, m) => s + m.salario, 0);
  club.presupuesto -= weeklyWages + staffWages;
}

// ── Update league table ───────────────────────────────────────

export function updateLeagueTable(
  club: Club,
  golesF: number,
  golesC: number,
): void {
  club.pj++;
  club.gf += isNaN(golesF) ? 0 : golesF;
  club.gc += isNaN(golesC) ? 0 : golesC;

  if (golesF > golesC) {
    club.pg++; club.pts += 3; club.forma.push('W');
    club.rep = Math.min(100, club.rep + 0.5);
  } else if (golesF === golesC) {
    club.pe++; club.pts += 1; club.forma.push('D');
  } else {
    club.pp++; club.forma.push('L');
    club.rep = Math.max(0, club.rep - 0.3);
  }

  club.forma = club.forma.slice(-5);
}

// ── Process pending works ─────────────────────────────────────

export function processPendingWorks(club: Club): string[] {
  const completed: string[] = [];
  club.obras = club.obras
    .map(w => ({ ...w, jornadasRestantes: w.jornadasRestantes - 1 }))
    .filter(w => {
      if (w.jornadasRestantes <= 0) {
        const def = WORKS_DEF[w.tipo];
        if (def) def.apply(club);
        completed.push(w.label);
        return false;
      }
      return true;
    });
  return completed;
}

// ── Start work ────────────────────────────────────────────────

export function startWork(
  club: Club,
  tipo: string,
): { ok: boolean; error?: string } {
  const def = WORKS_DEF[tipo];
  if (!def) return { ok: false, error: 'Obra no encontrada' };
  if (club.obras.some(w => w.tipo === tipo)) return { ok: false, error: 'Ya hay una obra de este tipo en curso' };
  if (club.presupuesto < def.cost) return { ok: false, error: 'Presupuesto insuficiente' };
  if (tipo.startsWith('aforo') && club.stadium.capacidad >= 90000) return { ok: false, error: 'Aforo máximo alcanzado (90.000)' };

  club.presupuesto -= def.cost;
  club.obras.push({
    id: uuidv4(),
    tipo: tipo as any,
    label: def.label,
    jornadasRestantes: def.jornadas,
    coste: def.cost,
    startedAt: 0,
  });

  return { ok: true };
}

// ── New season ────────────────────────────────────────────────


// ── F4-1: reescalar club tras cambio de división ─────────────

const DIV_BUDGET_BASE  = [50_000_000, 12_000_000, 2_500_000];  // presupuesto medio por div
const DIV_SPONSOR_BASE = [4_000_000,  800_000,    120_000];     // patrocinio base por div
const DIV_OBJETIVOS    = [
  ['Campeón', 'Top 8', 'Media tabla', 'Salvación'],
  ['Ascenso', 'Media tabla', 'Salvación'],
  ['Ascenso', 'Salvación'],
];

function reescalarClub(club: Club, oldDiv: number): void {
  const newDiv = club.div;
  if (newDiv === oldDiv) return;

  const ascending = newDiv < oldDiv; // subir = número menor

  // Presupuesto: ajuste relativo entre divisiones
  const ratio = DIV_BUDGET_BASE[newDiv] / DIV_BUDGET_BASE[oldDiv];
  club.presupuesto        = Math.round(club.presupuesto * ratio * (ascending ? 1.3 : 0.7));
  club.presupuestoInicial = club.presupuesto;

  // Patrocinio base
  club.patrocinioBase = Math.round(
    DIV_SPONSOR_BASE[newDiv] * (0.8 + Math.random() * 0.4)
  );

  // Objetivo coherente con nueva división
  const objetivos = DIV_OBJETIVOS[newDiv];
  club.objetivo = ascending
    ? objetivos[Math.min(1, objetivos.length - 1)]   // Salvación al ascender
    : objetivos[0];                                   // Ascenso al descender

  // Capacidad del estadio: pequeña limitación al descender (no se pierde al ascender)
  if (!ascending && club.stadium.capacidad > 25_000) {
    club.stadium.entradas_precio = Math.max(8, Math.round(club.stadium.entradas_precio * 0.75));
  }
}

export async function startNewSeason(state: GameState): Promise<GameState> {
  const myClub = state.liga.find(c => c.id === state.clubId)!;
  const divClubs = [...state.liga.filter(c => c.div === myClub.div)]
    .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));

  // F3-4: Ascenso/descenso entre divisiones
  // D1 (div 0): top 2 bajan a D2 → no aplica (ya es la cima)
  // D2 (div 1): top 2 suben a D1, bottom 2 bajan a D3
  // D3 (div 2): top 2 suben a D2
  [0, 1, 2].forEach(div => {
    const divTeams = [...state.liga.filter(c => c.div === div as Division)]
      .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));

    if (div === 0) {
      divTeams.slice(-2).forEach(club => {
        const oldDiv = club.div;
        club.div = 1;
        club.rep = Math.max(0, club.rep - 10);
        reescalarClub(club, oldDiv); // F4-1
      });
    } else if (div === 1) {
      divTeams.slice(0, 2).forEach(club => {
        const oldDiv = club.div;
        club.div = 0;
        club.rep = Math.min(100, club.rep + 10);
        reescalarClub(club, oldDiv); // F4-1
      });
      divTeams.slice(-2).forEach(club => {
        const oldDiv = club.div;
        club.div = 2;
        club.rep = Math.max(0, club.rep - 8);
        reescalarClub(club, oldDiv); // F4-1
      });
    } else if (div === 2) {
      divTeams.slice(0, 2).forEach(club => {
        const oldDiv = club.div;
        club.div = 1;
        club.rep = Math.min(100, club.rep + 8);
        reescalarClub(club, oldDiv); // F4-1
      });
    }
  });

  // Apply prizes + progression to all clubs
  state.liga.forEach(club => {
    const div = state.liga.filter(c => c.div === club.div).sort((a, b) => b.pts - a.pts);
    const pos = div.findIndex(c => c.id === club.id) + 1;

    // Classification prizes
    if (pos <= 2)       club.presupuesto += 3_000_000;
    else if (pos <= 6)  club.presupuesto += 1_000_000;
    else if (pos <= 10) club.presupuesto += 500_000;

    // Reset table
    club.pj = club.pg = club.pe = club.pp = club.gf = club.gc = club.pts = 0;
    club.forma = [];

    // Player progression
    club.plantilla.forEach(p => endOfSeasonProgression(p));

    // Contract renewals: AI auto-renews if >80 skill
    club.plantilla.forEach(p => {
      if (p.contrato <= 0) {
        if (p.media >= 80 && club.presupuesto > p.salario * 52) {
          p.contrato = 2;
          p.salario  = Math.round(p.salario * 1.1);
        } else {
          // Becomes free agent - move to free market
          state.mercadoLibre.push({ ...p, enVenta: false, enCesion: false });
        }
      } else {
        p.contrato--;
      }
    });

    // Remove expired players
    club.plantilla = club.plantilla.filter(p => p.contrato > 0);
  });

  // New calendar
  const divIds = state.liga.filter(c => c.div === myClub.div).map(c => c.id);
  const newCal  = generateCalendar(divIds);

  // Manager rep
  const myPos = divClubs.findIndex(c => c.id === state.clubId) + 1;
  const objMet = checkObjective(myClub, myPos);
  state.repManager = Math.min(100, Math.max(0,
    state.repManager + (objMet ? 10 : -10)
  ));
  state.experienciaManager += objMet ? 200 : 50;

  // Fresh cantera each season
  const ojeador2 = myClub.staff.find(s => s.rol === 'ojeador');
  const { generateCantera: gc2, generateFriendlyOptions: gfo2, buildSeasonSummary } = await import('../simulation/preseason');
  myClub.cantera = gc2(myClub.div, ojeador2?.nivel ?? 2);

  // Season summary before resetting
  const summary = buildSeasonSummary(state);
  const historial = [...(state.historialTemporadas ?? []), summary];

  // Rep update
  state.repManager = Math.min(100, Math.max(0, state.repManager + (summary.objetivoCumplido ? 10 : -10)));
  state.experienciaManager += summary.objetivoCumplido ? 200 : 50;

  const tempState2: any = { liga: state.liga, clubId: state.clubId, amistosos: [], amistososJugados: 0 };
  const newAmistosos = gfo2(tempState2 as any);

  return {
    ...state,
    temporada: state.temporada + 1,
    jornada: 1,
    fase: 'pretemporada',
    calendario: newCal,
    jornadaInvierno: Math.floor(newCal.length / 2),
    resultados: [],
    amistosos: newAmistosos,
    amistososJugados: 0,
    mercadoLibre: generateFreeMarket(),
    transferencias: [],
    ultimasBajas: [],
    ultimasFichas: [],
    informesScouting: [],
    patrocinadorFirmado: false,
    eventosActivos: [],
    trivialJornada: 0,
    trivialUsadas: [],
    temporadaTerminada: false,
    liveMatchActive: false,
    jornadasEnDeficit: 0,
    bloqueadoPorDeuda: false,
    advertenciaDirectiva: false,
    historialResultados: [],
    recomendacionesPostPartido: [],
    scoutRequests: [],
    promesasMinutos: [],
    presupuestoInicioTemporada: myClub.presupuesto,  // F6-3: guardar para comparativa
    alineacion: autoSelectLineup(myClub, state.tactica.sistema),
    historialTemporadas: historial,
  };
}

// ── Check objective ───────────────────────────────────────────

function checkObjective(club: Club, position: number): boolean {
  switch (club.objetivo) {
    case 'Campeón':      return position === 1;
    case 'Top 8':        return position <= 8;
    case 'Media tabla':  return position <= 12;
    case 'Salvación':    return position <= 16;
    case 'Ascenso':      return position <= 2;
    default:             return position <= 10;
  }
}

// ── Get sorted standings ──────────────────────────────────────

export function getStandings(liga: Club[], div: number): Club[] {
  return liga
    .filter(c => c.div === div)
    .sort((a, b) =>
      b.pts - a.pts ||
      (b.gf - b.gc) - (a.gf - a.gc) ||
      b.gf - a.gf
    );
}
