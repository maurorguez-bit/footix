/**
 * SIMULATION ENGINE v2
 *
 * Key design principle:
 * The live match animation shows EXACTLY what happened.
 * We pre-compute the full match result, then replay events
 * chronologically during the animation. No divergence.
 */

import type {
  Club, Player, MatchResult, MatchGoal, MatchCard,
  MatchInjury, MatchEvent, PlayerRating, Position
} from '../../shared/types/index';

// ── Helpers ──────────────────────────────────────────────────

const rnd = (a: number, b: number) =>
  Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
const uid = () => Math.random().toString(36).slice(2, 10);

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// ── Player effective rating ───────────────────────────────────

function playerEffRating(p: Player): number {
  const formaMult  = 0.7 + (p.forma  / 100) * 0.3;
  const fisicoMult = 0.8 + (p.fisico / 100) * 0.2;
  const moralMult  = 0.9 + (p.moral  / 100) * 0.1;
  // Emocion afecta rendimiento real
  const emocionMult =
    p.emocion === 'feliz'        ? 1.03 :
    p.emocion === 'neutral'      ? 1.00 :
    p.emocion === 'insatisfecho' ? 0.97 :
    p.emocion === 'enfadado'     ? 0.93 :
    p.emocion === 'conflicto'    ? 0.88 : 1.00;
  return p.media * formaMult * fisicoMult * moralMult * emocionMult;
}

// ── Team effective rating ─────────────────────────────────────

export function teamEffRating(
  club: Club,
  alineacion: string[] | null,
  sistema: string = '4-4-2'
): number {
  // Use selected lineup if provided and valid
  const ids = alineacion?.slice(0, 11) ?? [];
  let players: Player[] = [];

  if (ids.length >= 10) {
    players = ids
      .map(id => club.plantilla.find(p => p.id === id))
      .filter((p): p is Player => !!p && !p.lesionado);
  }

  // Fallback: best 11 available
  if (players.length < 8) {
    players = [...club.plantilla]
      .filter(p => !p.lesionado && !p.tarjetas_rojas && !p.convocado)
      .sort((a, b) => b.media - a.media)
      .slice(0, 11);
  }

  if (players.length === 0) return 50;

  const avg = players.reduce((s, p) => s + playerEffRating(p), 0) / players.length;

  // Staff bonuses
  const entrenador = club.staff.find(s => s.rol === 'entrenador');
  const staffBonus = entrenador ? (entrenador.nivel - 3) * 0.5 : 0;

  return Math.max(30, Math.min(99, avg + staffBonus));
}

// ── Injury generator ──────────────────────────────────────────

const INJURY_TYPES = [
  'Esguince de tobillo', 'Rotura de ligamentos', 'Desgarro muscular',
  'Contusión', 'Fractura', 'Sobrecarga muscular', 'Tendinitis',
];

const INJURY_SEVERITY: Record<string, [number, number]> = {
  'Esguince de tobillo':     [1, 3],
  'Rotura de ligamentos':    [8, 16],
  'Desgarro muscular':       [3, 6],
  'Contusión':               [1, 2],
  'Fractura':                [6, 12],
  'Sobrecarga muscular':     [1, 2],
  'Tendinitis':              [2, 4],
};

function generateInjury(
  club: Club,
  equipo: 'local' | 'visitante',
  minuto: number,
  fisioLevel: number
): MatchInjury | null {
  // Reduced base probability: ~6% per match (was ~20%)
  const baseProb = 0.06;
  const fisioReduction = (fisioLevel - 1) * 0.008; // 0.8% per level
  if (Math.random() > baseProb - fisioReduction) return null;

  const available = club.plantilla.filter(p => !p.lesionado);
  if (available.length === 0) return null;

  // Prefer fatigued players
  const pool = available.sort((a, b) => a.fisico - b.fisico).slice(0, 6);
  const player = pick(pool);
  const tipo = pick(INJURY_TYPES);
  const [minW, maxW] = INJURY_SEVERITY[tipo];
  const semanas = rnd(minW, maxW);

  // Apply injury
  player.lesionado = true;
  player.lesion_jornadas = semanas;
  player.lesionTipo = tipo;

  return {
    playerId: player.id,
    playerName: `${player.nombre} ${player.apellido}`,
    minuto,
    semanas,
    tipo,
    equipo,
  };
}

// ── Card generator ────────────────────────────────────────────

function generateCards(
  club: Club,
  equipo: 'local' | 'visitante',
  isHome: boolean
): MatchCard[] {
  const cards: MatchCard[] = [];
  // Reduced: ~2 yellows avg, red very rare (2% chance)
  const numYellow = poisson(1.8);
  const pool = club.plantilla.filter(
    p => p.pos !== 'POR' && !p.lesionado
  );
  if (pool.length === 0) return cards;

  const cardedPlayers = new Set<string>();

  for (let i = 0; i < Math.min(numYellow, 4); i++) {
    const p = pick(pool.filter(x => !cardedPlayers.has(x.id)));
    if (!p) break;

    const minuto = rnd(5, 90);
    const isRed = Math.random() < 0.02; // 2% chance of direct red

    if (isRed) {
      p.tarjetas_rojas++;
      cards.push({ playerId: p.id, playerName: `${p.nombre} ${p.apellido}`, minuto, tipo: 'roja', equipo });
      cardedPlayers.add(p.id);
    } else {
      p.tarjetas_amarillas++;
      // Second yellow → red (only if already has one this match)
      if (cardedPlayers.has(p.id)) {
        p.tarjetas_rojas++;
        cards.push({ playerId: p.id, playerName: `${p.nombre} ${p.apellido}`, minuto, tipo: 'segunda_amarilla', equipo });
      } else {
        cards.push({ playerId: p.id, playerName: `${p.nombre} ${p.apellido}`, minuto, tipo: 'amarilla', equipo });
        cardedPlayers.add(p.id);
      }
    }
  }

  return cards.sort((a, b) => a.minuto - b.minuto);
}

// ── Goal generator ────────────────────────────────────────────

function generateGoals(
  club: Club,
  n: number,
  equipo: 'local' | 'visitante'
): MatchGoal[] {
  const goals: MatchGoal[] = [];
  if (n === 0) return goals;

  // Weight by position: strikers 60%, mids 30%, defenders 8%, own 2%
  const delanteros = club.plantilla.filter(p => p.pos === 'DEL' && !p.lesionado);
  const medios     = club.plantilla.filter(p => p.pos === 'MED' && !p.lesionado);
  const defensas   = club.plantilla.filter(p => p.pos === 'DEF' && !p.lesionado);

  const minutosUsados = new Set<number>();

  for (let i = 0; i < n; i++) {
    let scorer: Player | undefined;
    const r = Math.random();
    if (r < 0.60 && delanteros.length)      scorer = pick(delanteros);
    else if (r < 0.90 && medios.length)     scorer = pick(medios);
    else if (defensas.length)               scorer = pick(defensas);
    else scorer = pick([...delanteros, ...medios]);

    if (!scorer) continue;

    // Unique minute
    let minuto = rnd(1, 90);
    let attempts = 0;
    while (minutosUsados.has(minuto) && attempts < 10) {
      minuto = rnd(1, 90);
      attempts++;
    }
    minutosUsados.add(minuto);

    scorer.goles++;
    scorer.partidos++;

    const tipo = Math.random() < 0.15 ? 'penal' : 'normal';
    goals.push({
      playerId: scorer.id,
      playerName: `${scorer.nombre} ${scorer.apellido}`,
      minuto,
      equipo,
      tipo,
    });
  }

  return goals.sort((a, b) => a.minuto - b.minuto);
}

// ── Player ratings ────────────────────────────────────────────

function generateRatings(
  club: Club,
  golesEq: number,
  golesRiv: number,
  alineacion: string[]
): PlayerRating[] {
  // F8-4: guard — alineación vacía es válida para clubs sin lineup configurado
  if (!alineacion || alineacion.length === 0) return [];
  const ratings: PlayerRating[] = [];
  const won = golesEq > golesRiv;
  const lost = golesEq < golesRiv;
  const base = won ? 6.5 : lost ? 5.5 : 6.0;

  const titulares = new Set(alineacion.slice(0, 11));

  alineacion.forEach(id => {
    const p = club.plantilla.find(x => x.id === id);
    if (!p) return;

    const isTitular = titulares.has(id);
    const variance = (Math.random() - 0.5) * 2.5;
    const formBonus = (p.forma - 70) / 100;
    const goalBonus = p.goles > 0 ? 0.8 : 0;
    const bench = isTitular ? 0 : -0.5;

    let nota = Math.max(3, Math.min(10,
      base + variance + formBonus + goalBonus + bench
    ));
    nota = Math.round(nota * 10) / 10;

    // Tendencia: comparar con notaMedia anterior (antes de actualizarla)
    const prevMedia = p.notaMedia;
    // Update player season rating
    const n2 = p.partidos || 1;
    p.notaMedia         = Math.round(((prevMedia * (n2 - 1) + nota) / n2) * 10) / 10;
    p.notaUltimoPartido = nota;
    // prevMedia=0 significa primer partido — no hay referencia previa
    const tendencia: 'up' | 'stable' | 'down' =
      prevMedia === 0 ? 'stable' :          // primer partido: sin tendencia
      nota >= prevMedia + 0.5 ? 'up' :
      nota <= prevMedia - 0.5 ? 'down' : 'stable';
    p.tendencia = tendencia;

    // XP por partido: más si gana, menos si empata, nada si pierde
    const xpPartido = won ? 15 : !lost ? 8 : 0;
    p.experiencia = (p.experiencia || 0) + xpPartido;

    ratings.push({
      playerId: id,
      playerName: `${p.nombre} ${p.apellido}`,
      nota,
      destacado: nota >= 8.5,
      tendencia,
    });
  });

  return ratings.sort((a, b) => b.nota - a.nota);
}

// ── Narration generator ───────────────────────────────────────

const PASS_PHRASES = [
  (a: string, b: string) => `${a} la juega en corto para ${b}`,
  (a: string, b: string) => `${a} filtra un pase interior a ${b}`,
  (a: string, b: string) => `Combinación rápida, ${a} habilita a ${b}`,
];

const SHOT_PHRASES = [
  (n: string) => `${n} dispara desde el área...`,
  (n: string) => `${n} remata de volea...`,
  (n: string) => `${n} entra solo ante el portero...`,
];

const GOAL_PHRASES = [
  (n: string, eq: string) => `¡GOOOL de ${n}! ${eq} se pone por delante 🔥`,
  (n: string, eq: string) => `¡Gol de ${n}! ¡El estadio estalla! ⚽`,
  (n: string, eq: string) => `¡Lo mete dentro ${n}! Imparable. Gol de ${eq} 💥`,
];

const ACTION_PHRASES = [
  (a: string) => `${a} controla en el área, pero el defensa llega a tiempo`,
  (a: string) => `Disparo de ${a} al palo. ¡Qué cerca estuvo!`,
  (a: string) => `El portero para el remate de ${a} con una mano`,
  (a: string) => `${a} la manda al córner tras un regate`,
  (a: string) => `Falta peligrosa. ${a} coloca el balón...`,
];

export function buildNarration(
  goalEvent: MatchGoal | null,
  action: string | null,
  localName: string,
  visitanteName: string,
  localPlayers: Player[],
  visitantePlayers: Player[],
): string {
  if (goalEvent) {
    const asistente = pick([...localPlayers, ...visitantePlayers].filter(
      p => p.id !== goalEvent.playerId && p.pos !== 'POR'
    ));
    const eqName = goalEvent.equipo === 'local' ? localName : visitanteName;

    const passPhrase = asistente
      ? pick(PASS_PHRASES)(asistente.nombre, goalEvent.playerName.split(' ')[0])
      : `${pick(localPlayers.filter(p => p.pos === 'MED'))?.nombre ?? 'El centrocampista'} lanza en profundidad`;

    const shotPhrase = pick(SHOT_PHRASES)(goalEvent.playerName.split(' ')[0]);
    const goalPhrase = pick(GOAL_PHRASES)(goalEvent.playerName.split(' ')[0], eqName);

    return `${passPhrase}. ${shotPhrase} ${goalPhrase}`;
  }

  if (action) return action;

  const rndPlayer = pick([...localPlayers, ...visitantePlayers].filter(p => p.pos !== 'POR'));
  return pick(ACTION_PHRASES)(rndPlayer?.nombre ?? 'El jugador');
}

// ── MAIN: Simulate full match ─────────────────────────────────

export interface SimulationInput {
  local: Club;
  visitante: Club;
  myClubId: string;
  myAlineacion: string[];
  tactica: { sistema: string; enfoque: TacticFocus };
  jornada: number;
}

export function simulateMatch(input: SimulationInput): MatchResult {
  const { local, visitante, myClubId, myAlineacion, tactica, jornada } = input;

  // ── Compute effective ratings ──
  const isMyLocal = local.id === myClubId;
  const isMyVisit = visitante.id === myClubId;

  let rL = teamEffRating(local, isMyLocal ? myAlineacion : null, tactica.sistema);
  let rV = teamEffRating(visitante, isMyVisit ? myAlineacion : null, tactica.sistema);

  // Tactic modifiers (only for my club)
  if (isMyLocal) {
    if (tactica.enfoque === 'ofensivo')  { rL += 2.5; rV -= 1.5; }
    if (tactica.enfoque === 'defensivo') { rL -= 1.0; rV -= 3.0; }
  }
  if (isMyVisit) {
    if (tactica.enfoque === 'ofensivo')  { rV += 2.5; rL -= 1.5; }
    if (tactica.enfoque === 'defensivo') { rV -= 1.0; rL -= 3.0; }
  }

  // Home advantage
  rL += 4 + (local.stadium.instalaciones / 10) * 2;

  // ── Expected goals (poisson) ──
  const xgL = Math.max(0.2, (rL / 100) * 2.2);
  const xgV = Math.max(0.2, (rV / 100) * 1.6);
  const golesL = poisson(xgL);
  const golesV = poisson(xgV);

  // ── Generate goals ──
  const golesLocalData = generateGoals(local, golesL, 'local');
  const golesVisitData = generateGoals(visitante, golesV, 'visitante');
  const allGoals = [...golesLocalData, ...golesVisitData].sort((a, b) => a.minuto - b.minuto);

  // ── Generate cards ──
  const fisioLv = local.staff.find(s => s.rol === 'fisio')?.nivel ?? 3;
  const fisioVLv = visitante.staff.find(s => s.rol === 'fisio')?.nivel ?? 3;
  const tarjetasL = generateCards(local, 'local', true);
  const tarjetasV = generateCards(visitante, 'visitante', false);
  const allCards = [...tarjetasL, ...tarjetasV].sort((a, b) => a.minuto - b.minuto);

  // ── Generate injuries (1 per match at most, usually 0) ──
  const lesiones: MatchInjury[] = [];
  const injL = generateInjury(local, 'local', rnd(20, 85), fisioLv);
  if (injL) lesiones.push(injL);
  const injV = generateInjury(visitante, 'visitante', rnd(20, 85), fisioVLv);
  if (injV) lesiones.push(injV);

  // ── Stats ──
  const posL = Math.round(45 + (rL - rV) * 0.3);
  const tirosL = Math.round(8 + golesL * 2 + Math.random() * 6);
  const tirosV = Math.round(6 + golesV * 2 + Math.random() * 5);

  // ── Build chronological event feed ──
  const eventos: MatchEvent[] = [];

  allGoals.forEach(g => {
    const equipo = g.equipo;
    const eqClub = equipo === 'local' ? local : visitante;
    const rivalClub = equipo === 'local' ? visitante : local;
    const narr = buildNarration(
      g, null,
      local.nombre, visitante.nombre,
      eqClub.plantilla, rivalClub.plantilla,
    );
    eventos.push({ minuto: g.minuto, tipo: 'gol', equipo, playerName: g.playerName, descripcion: narr });
  });

  allCards.forEach(c => {
    const desc = c.tipo === 'roja'
      ? `🟥 Tarjeta roja directa para ${c.playerName}. Se queda con 10.`
      : c.tipo === 'segunda_amarilla'
      ? `🟥 Segunda amarilla para ${c.playerName}. Fuera del campo.`
      : `🟨 Tarjeta amarilla para ${c.playerName}.`;
    eventos.push({ minuto: c.minuto, tipo: 'tarjeta', equipo: c.equipo, playerName: c.playerName, descripcion: desc });
  });

  lesiones.forEach(l => {
    const desc = `🚑 ${l.playerName} sale lesionado por ${l.tipo.toLowerCase()}. Baja ${l.semanas} semana${l.semanas !== 1 ? 's' : ''}.`;
    eventos.push({ minuto: l.minuto, tipo: 'lesion', equipo: l.equipo, playerName: l.playerName, descripcion: desc });
  });

  // Add some neutral action events between goal moments
  const goalMinutos = new Set(allGoals.map(g => g.minuto));
  [15, 30, 42, 55, 68, 78, 85].forEach(m => {
    if (!goalMinutos.has(m) && Math.random() < 0.7) {
      const isLocalAction = Math.random() < posL / 100;
      const eqClub = isLocalAction ? local : visitante;
      const player = pick(eqClub.plantilla.filter(p => p.pos !== 'POR' && !p.lesionado));
      if (player) {
        const narr = buildNarration(null, null, local.nombre, visitante.nombre, local.plantilla, visitante.plantilla);
        eventos.push({ minuto: m, tipo: 'accion', equipo: isLocalAction ? 'local' : 'visitante', playerName: player.nombre, descripcion: narr });
      }
    }
  });

  eventos.sort((a, b) => a.minuto - b.minuto);

  // ── Ratings ──
  const myAlin = isMyLocal ? myAlineacion : isMyVisit ? myAlineacion : [];
  // F4-2: CPU usa los mejores 11 disponibles, no una slice arbitraria de 18
  const cpuBest11Local = [...local.plantilla]
    .filter(p => !p.lesionado && !p.tarjetas_rojas && !p.convocado)
    .sort((a, b) => b.media - a.media).slice(0, 11).map(p => p.id);
  const cpuBest11Visit = [...visitante.plantilla]
    .filter(p => !p.lesionado && !p.tarjetas_rojas && !p.convocado)
    .sort((a, b) => b.media - a.media).slice(0, 11).map(p => p.id);

  const ratingsL = generateRatings(local,     golesL, golesV, isMyLocal ? myAlineacion : cpuBest11Local);
  const ratingsV = generateRatings(visitante, golesV, golesL, isMyVisit ? myAlineacion : cpuBest11Visit);
  const allRatings = [...ratingsL, ...ratingsV];

  // ── MVP ──
  const mvp = allRatings.sort((a, b) => b.nota - a.nota)[0]?.playerId ?? '';

  // ── Update match-related player stats ──
  const updatePartidos = (club: Club, alin: string[]) => {
    // Resetear mejorasSemana de TODA la plantilla cada jornada
    // Causa: el anti-abuso de entrenamiento debe ser semanal, no permanente
    club.plantilla.forEach(p => { p.mejorasSemana = 0; });

    alin.slice(0, 11).forEach(id => {
      const p = club.plantilla.find(x => x.id === id);
      if (p) {
        p.partidos       = (p.partidos       || 0) + 1;
        p.minutosJugados = (p.minutosJugados || 0) + 90;
        p.fisico = Math.max(30, p.fisico - rnd(3, 8));
        const won  = local.id === club.id ? golesL > golesV : golesV > golesL;
        const drew = golesL === golesV;
        p.forma = Math.max(20, Math.min(100,
          p.forma + (won ? rnd(1, 4) : drew ? 0 : rnd(-3, -1))
        ));
      }
    });
  };

  // F4-2: reusar el best11 calculado arriba para updatePartidos
  updatePartidos(local,     isMyLocal ? myAlineacion : cpuBest11Local);
  updatePartidos(visitante, isMyVisit ? myAlineacion : cpuBest11Visit);

  return {
    id: uid(),
    jornada,
    localId: local.id,
    visitanteId: visitante.id,
    golesLocal: golesL,
    golesVisitante: golesV,
    goles: allGoals,
    tarjetas: allCards,
    lesiones,
    eventos,
    ratings: allRatings,
    stats: {
      posesionLocal:    Math.max(20, Math.min(80, posL)),
      posesionVisitante: Math.min(80, Math.max(20, 100 - posL)),
      tirosLocal: tirosL,
      tirosVisitante: tirosV,
      corners: [rnd(2, 8), rnd(1, 7)],
      faltas: [rnd(8, 18), rnd(6, 16)],
    },
    mvp,
  };
}

// ── AI Transfers ──────────────────────────────────────────────

export function aiTransferDecision(
  club: Club,
  player: Player,
  ofertedPrice: number
): boolean {
  // AI accepts if:
  // - Price is >= 90% of clausula, OR
  // - Price >= 120% of valor and player has bad form/morale, OR
  // - Club needs money (budget < 10% of initial)
  const needsMoney = club.presupuesto < club.presupuestoInicial * 0.1;
  const playerUnhappy = player.emocion === 'enfadado' || player.emocion === 'conflicto';

  if (ofertedPrice >= player.clausula) return true;
  if (ofertedPrice >= player.valor * 1.2 && playerUnhappy) return true;
  if (ofertedPrice >= player.valor * 1.5 && needsMoney) return true;
  if (ofertedPrice >= player.valor * 0.9) return Math.random() < 0.4;

  return false;
}

// ── Training effect ───────────────────────────────────────────

export function applyTraining(
  player: Player,
  tipo: TrainingType,
  entrenadorLevel: number
): { atributo: string; delta: number; fatigaDelta: number } {
  const multiplier = 1 + (entrenadorLevel - 3) * 0.1;
  const base = rnd(1, 3) * multiplier;

  // Can't over-train: diminishing returns past 3 sessions/week
  const overtrainPenalty = player.mejorasSemana >= 3 ? 0.3 : 1;

  let atributo = '';
  let delta = 0;
  let fatigaDelta = 0;

  switch (tipo) {
    case 'fisico':
      atributo = 'fisico';
      delta = Math.round(base * overtrainPenalty * 1.5);
      fatigaDelta = -rnd(5, 12);
      break;
    case 'tecnico':
      // Slow improvement to media
      if (player.media < player.potencial) {
        atributo = 'media';
        delta = Math.random() < 0.3 ? 1 : 0;
      } else {
        atributo = 'forma';
        delta = Math.round(base * overtrainPenalty);
      }
      fatigaDelta = -rnd(3, 8);
      break;
    case 'tactico':
      atributo = 'forma';
      delta = Math.round(base * overtrainPenalty);
      fatigaDelta = -rnd(2, 6);
      break;
    case 'recuperacion':
      atributo = 'fisico';
      delta = Math.round(base * 2);
      fatigaDelta = rnd(8, 20); // recovery increases fitness
      break;
  }

  player.mejorasSemana = (player.mejorasSemana || 0) + 1;

  // Apply to player
  if (atributo === 'fisico') {
    player.fisico = Math.max(0, Math.min(100, player.fisico + (tipo === 'recuperacion' ? fatigaDelta : delta)));
  } else if (atributo === 'forma') {
    player.forma = Math.max(0, Math.min(100, player.forma + delta));
  } else if (atributo === 'media') {
    player.media = Math.min(player.potencial, player.media + delta);
  }

  return { atributo, delta, fatigaDelta };
}

// ── Season progression ────────────────────────────────────────

export function endOfSeasonProgression(player: Player): void {
  // Young players improve
  if (player.edad < 23 && player.media < player.potencial) {
    player.media = Math.min(player.potencial, player.media + rnd(1, 3));
  }

  // Prime players (23-29): slight improvement or stable
  if (player.edad >= 23 && player.edad < 30 && player.media < player.potencial) {
    if (Math.random() < 0.4) player.media = Math.min(player.potencial, player.media + 1);
  }

  // Older players decline
  if (player.edad >= 30) {
    const declineRate = Math.max(0, (player.edad - 29) * 0.5);
    if (Math.random() < declineRate * 0.3) {
      player.media = Math.max(40, player.media - 1);
    }
  }

  // Save historical average
  player.mediaTemporadas = [...(player.mediaTemporadas || []), player.media];

  // Reset season stats
  player.goles = 0;
  player.asistencias = 0;
  player.partidos = 0;
  player.minutosJugados = 0;
  player.tarjetas_amarillas = 0;
  player.tarjetas_rojas = 0;
  player.notaMedia = 0;
  player.mejorasSemana = 0;

  // Age
  player.edad++;

  // Restore fitness and form
  player.forma = rnd(60, 85);
  player.fisico = rnd(70, 90);
  player.lesionado = false;
  player.lesion_jornadas = 0;
  player.moral = rnd(65, 90);
  player.emocion = 'neutral';
}


// ── F5-1: Recomendaciones automáticas post-partido ───────────

import type { PlayerRecommendation } from '../../../shared/types/index';

export function generateRecommendations(
  club: import('../../../shared/types/index').Club,
  alineacion: string[],
): PlayerRecommendation[] {
  const recs: PlayerRecommendation[] = [];
  const titularIds = new Set(alineacion.slice(0, 11));

  club.plantilla.filter(p => !p.lesionado && !p.convocado).forEach(p => {
    const esTitular = titularIds.has(p.id);

    // ENTRENAR: forma baja + varios partidos sin mejorar
    if (p.forma < 60 && p.fisico < 65) {
      recs.push({ playerId: p.id, playerNombre: `${p.nombre} ${p.apellido}`,
        tipo: 'entrenar',
        motivo: `Forma ${p.forma}/100 y físico ${p.fisico}/100 bajos. Sesión de recuperación recomendada.` });
      return;
    }

    // ROTAR: titular con fatiga alta
    if (esTitular && (p.fatiga ?? 0) > 70) {
      recs.push({ playerId: p.id, playerNombre: `${p.nombre} ${p.apellido}`,
        tipo: 'rotar',
        motivo: `Fatiga ${p.fatiga}/100. Riesgo de lesión o bajada de rendimiento. Dale descanso.` });
      return;
    }

    // VIGILAR CONFLICTO: emoción negativa sostenida
    if (p.emocion === 'enfadado' || p.emocion === 'conflicto') {
      recs.push({ playerId: p.id, playerNombre: `${p.nombre} ${p.apellido}`,
        tipo: 'vigilar_conflicto',
        motivo: `Estado emocional: ${p.emocion}. Moral ${p.moral}/100. Puede pedir la salida.` });
      return;
    }

    // CONSIDERAR VENTA: mayor 32 + media bajando + contrato corto
    if (p.edad >= 32 && p.contrato <= 1 && p.tendencia === 'down') {
      recs.push({ playerId: p.id, playerNombre: `${p.nombre} ${p.apellido}`,
        tipo: 'considerar_venta',
        motivo: `${p.edad} años, contrato acaba, rendimiento en descenso. Buen momento para vender.` });
      return;
    }

    // MANTENER: solo si es top performer o en racha de alza — reducir spam
    if (esTitular && p.notaMedia >= 7.0 && p.tendencia === 'up' && p.forma >= 75) {
      recs.push({ playerId: p.id, playerNombre: `${p.nombre} ${p.apellido}`,
        tipo: 'mantener',
        motivo: `En alza: media ${p.notaMedia.toFixed(1)}, forma ${p.forma}/100. Sigue así.` });
    }
  });

  // Limitar a 6 recomendaciones (las más urgentes primero)
  const prioridad: Record<PlayerRecommendation['tipo'], number> = {
    vigilar_conflicto: 0, considerar_venta: 1, entrenar: 2, rotar: 3, mantener: 4,
  };
  return recs.sort((a, b) => prioridad[a.tipo] - prioridad[b.tipo]).slice(0, 4);  // F6-1: max 4
}

export type { TrainingType };
