/**
 * MARKET ROUTES — /api/market/:slot/*
 * All buy/sell/loan operations are gated by transfer window.
 */
import { Router, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/errorHandler';
import { aiTransferDecision, applyTraining } from '../simulation/engine';
import { autoSelectLineup } from '../services/gameService';
import { resolveEvent } from '../events/gameEvents';
import { getRandomTrivialSet, calculateTrivialXP } from '../utils/trivial';
import { generateLootPlayer } from '../utils/dataGenerator';
import { getTransferWindow, isWindowOpen, windowClosedError } from '../utils/transferWindow';
import type { GameState, Club } from '../../../shared/types/index';
import { v4 as uuidv4 } from 'uuid';

// ── Helpers ───────────────────────────────────────────────────

function parse(raw: string): GameState {
  const s = JSON.parse(raw) as any;
  // F8-6: normalización mínima en market
  s.jornadasEnDeficit   = s.jornadasEnDeficit   ?? 0;
  s.bloqueadoPorDeuda   = s.bloqueadoPorDeuda   ?? false;
  s.historialTransferencias = s.historialTransferencias ?? [];
  s.promesasMinutos     = s.promesasMinutos     ?? [];
  s.scoutRequests       = s.scoutRequests       ?? [];
  s.liga?.forEach((club: any) => {
    club.plantilla?.forEach((p: any) => {
      p.convocado         = p.convocado         ?? false;
      p.convocadoJornadas = p.convocadoJornadas ?? 0;
    });
  });
  return s as GameState;
}
function myClub(g: GameState): Club    { return g.liga.find(c => c.id === g.clubId)!; }

// F5-3: registrar transferencia en historial
function logTransfer(state: GameState, entry: Omit<import('../../../shared/types/index').TransferRecord, 'id' | 'temporada' | 'jornada'>) {
  const record = { ...entry, id: Math.random().toString(36).slice(2), temporada: state.temporada, jornada: state.jornada };
  state.historialTransferencias = [...(state.historialTransferencias ?? []), record];
}

async function load(userId: string, slot: number) {
  const s = await prisma.gameSave.findUnique({ where: { userId_slot: { userId, slot } } });
  if (!s) throw new Error('Partida no encontrada');
  return { save: s, state: parse(s.state) };
}

async function save(userId: string, slot: number, state: GameState) {
  await prisma.gameSave.update({
    where: { userId_slot: { userId, slot } },
    data: { state: JSON.stringify(state) },
  });
}

// ─────────────────────────────────────────────────────────────
// MARKET
// ─────────────────────────────────────────────────────────────

export const marketRouter = Router();
marketRouter.use(authMiddleware);

// GET /api/market/:slot/window — current window status
marketRouter.get('/:slot/window', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json(getTransferWindow(state));
});

// GET /api/market/:slot/free
marketRouter.get('/:slot/free', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const pos      = req.query.pos as string | undefined;
  const maxAge   = req.query.maxAge   ? parseInt(req.query.maxAge   as string) : undefined;
  const minMedia = req.query.minMedia ? parseInt(req.query.minMedia  as string) : undefined;

  let players = [...state.mercadoLibre];
  if (pos)      players = players.filter(p => p.pos === pos);
  if (maxAge)   players = players.filter(p => p.edad <= maxAge);
  if (minMedia) players = players.filter(p => p.media >= minMedia);

  // Always return the list — window status is separate
  return res.json({ players, window: getTransferWindow(state) });
});

// POST /api/market/:slot/buy
marketRouter.post('/:slot/buy', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);

  // ── WINDOW GATE ──
  if (!isWindowOpen(state)) {
    return res.status(400).json({ error: windowClosedError(state) });
  }
  // ── F4-4: bloqueo por deuda crónica ──
  if (state.bloqueadoPorDeuda) {
    return res.status(400).json({ error: '🚫 Fichajes bloqueados por déficit crónico. Sanea las finanzas para desbloquear.' });
  }

  const { playerId, oferta } = req.body as { playerId: string; oferta: number };
  const club   = myClub(state);
  const player = state.mercadoLibre.find(p => p.id === playerId);

  if (!player) return res.status(404).json({ error: 'Jugador no encontrado en el mercado' });
  if (oferta > club.presupuesto) return res.status(400).json({ error: `Presupuesto insuficiente. Tienes ${Math.round(club.presupuesto/1000)}K€ y ofreces ${Math.round(oferta/1000)}K€` });

  const extraInSquad = club.plantilla.filter(p => p.nacionalidad === 'EX').length;
  if (player.nacionalidad === 'EX' && extraInSquad >= 3) {
    return res.status(400).json({ error: 'Límite de 3 extracomunitarios en plantilla alcanzado' });
  }

  const threshold = player.valor * (0.85 + Math.random() * 0.2);
  if (oferta < threshold) {
    return res.json({ aceptado: false, mensaje: 'El agente rechaza la oferta. Exige más.' });
  }

  club.presupuesto -= oferta;
  player.goles = 0; player.asistencias = 0; player.partidos = 0;
  club.plantilla.push(player);
  state.mercadoLibre = state.mercadoLibre.filter(p => p.id !== playerId);
  state.alineacion   = autoSelectLineup(club, state.tactica.sistema);
  console.log(`[buy] slot=${slot} J${state.jornada} ${state.liga.find((c:any)=>c.id===state.clubId)?.nombre} ← ${player.nombre} ${player.apellido} (${Math.round(oferta/1000)}K€)`);
  logTransfer(state, { kind: 'alta', playerNombre: `${player.nombre} ${player.apellido}`, clubNombre: 'Mercado libre', importe: oferta });

  await save(req.userId!, slot, state);
  return res.json({ aceptado: true, player, presupuesto: club.presupuesto });
});

// POST /api/market/:slot/sell
marketRouter.post('/:slot/sell', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);

  // ── WINDOW GATE ──
  if (!isWindowOpen(state)) {
    return res.status(400).json({ error: windowClosedError(state) });
  }

  const { playerId, precio } = req.body as { playerId: string; precio: number };
  const club   = myClub(state);
  const player = club.plantilla.find(p => p.id === playerId);

  if (!player)         return res.status(404).json({ error: 'Jugador no encontrado' });
  if (precio > player.clausula) return res.status(400).json({ error: 'El precio no puede superar la cláusula' });

  const aiWillBuy = aiTransferDecision(club, player, precio);

  if (aiWillBuy) {
    club.presupuesto += precio;
    club.plantilla    = club.plantilla.filter(p => p.id !== playerId);
    state.mercadoLibre.push({ ...player, enVenta: false });
    state.alineacion  = autoSelectLineup(club, state.tactica.sistema);
    console.log(`[sell] slot=${slot} J${state.jornada} ${player.nombre} ${player.apellido} → mercado libre (${Math.round(precio/1000)}K€)`);
  logTransfer(state, { kind: 'baja', playerNombre: `${player.nombre} ${player.apellido}`, clubNombre: 'Mercado libre', importe: precio });
    await save(req.userId!, slot, state);
    return res.json({ vendido: true, precio, presupuesto: club.presupuesto });
  }

  player.enVenta    = true;
  player.precioVenta = precio;
  await save(req.userId!, slot, state);
  return res.json({ vendido: false, enEspera: true, mensaje: 'Jugador puesto en venta. Esperando oferta.' });
});

// DELETE /api/market/:slot/sell/:playerId
marketRouter.delete('/:slot/sell/:playerId', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const club   = myClub(state);
  const player = club.plantilla.find(p => p.id === req.params.playerId);
  if (player) { player.enVenta = false; player.precioVenta = 0; }
  await save(req.userId!, slot, state);
  return res.json({ ok: true });
});

// POST /api/market/:slot/cesion
marketRouter.post('/:slot/cesion', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);

  // ── WINDOW GATE ──
  if (!isWindowOpen(state)) {
    return res.status(400).json({ error: windowClosedError(state) });
  }
  if (state.bloqueadoPorDeuda) {
    return res.status(400).json({ error: '🚫 Operaciones de mercado bloqueadas por déficit crónico.' });
  }

  const { playerId, rivalClubId, jornadas, tarifaCesion } = req.body as {
    playerId: string; rivalClubId: string; jornadas: number; tarifaCesion: number;
  };

  const club    = myClub(state);
  const player  = club.plantilla.find(p => p.id === playerId);
  const destino = state.liga.find(c => c.id === rivalClubId);

  if (!player)           return res.status(404).json({ error: 'Jugador no encontrado' });
  if (!destino)          return res.status(404).json({ error: 'Club destino no encontrado' });
  if (player.enCesion)   return res.status(400).json({ error: 'El jugador ya está cedido' });

  const samePos = destino.plantilla.filter(p => p.pos === player.pos).length;
  const aiAcepta = samePos < 6 && Math.random() < 0.65;
  if (!aiAcepta) return res.json({ aceptado: false, mensaje: 'El club rechaza la cesión.' });

  club.presupuesto   += tarifaCesion ?? 0;
  player.enCesion     = true;
  player.clubCesionId = rivalClubId;
  destino.plantilla.push({ ...player });
  club.plantilla     = club.plantilla.filter(p => p.id !== playerId);
  state.alineacion   = autoSelectLineup(club, state.tactica.sistema);
  logTransfer(state, { kind: 'cesion', playerNombre: `${player.nombre} ${player.apellido}`, clubNombre: destino.nombre, importe: tarifaCesion ?? 0 });

  await save(req.userId!, slot, state);
  return res.json({ aceptado: true, mensaje: `${player.nombre} ${player.apellido} cedido a ${destino.nombre}` });
});

// POST /api/market/:slot/intercambio — player + cash swap
marketRouter.post('/:slot/intercambio', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);

  // ── WINDOW GATE ──
  if (!isWindowOpen(state)) {
    return res.status(400).json({ error: windowClosedError(state) });
  }

  const { myPlayerId, rivalPlayerId, rivalClubId, diferencia } = req.body as {
    myPlayerId: string; rivalPlayerId: string; rivalClubId: string; diferencia: number;
  };

  const club    = myClub(state);
  const myP     = club.plantilla.find(p => p.id === myPlayerId);
  const rival   = state.liga.find(c => c.id === rivalClubId);
  const rivP    = rival?.plantilla.find(p => p.id === rivalPlayerId);

  if (!myP || !rival || !rivP) return res.status(404).json({ error: 'Jugadores no encontrados' });

  // diferencia < 0 means we pay, > 0 means we receive cash
  if (diferencia < 0 && club.presupuesto < Math.abs(diferencia)) {
    return res.status(400).json({ error: 'Presupuesto insuficiente para la diferencia' });
  }

  // AI accepts if it's a fair deal (rival player value >= my player value - 15%)
  const myVal  = myP.valor;
  const rivVal = rivP.valor;
  const aiOk   = (rivVal + diferencia) >= myVal * 0.85 && Math.random() < 0.6;
  if (!aiOk) return res.json({ aceptado: false, mensaje: 'El club rechaza el intercambio.' });

  // Execute
  club.presupuesto   += diferencia;
  rival.presupuesto  -= diferencia;
  club.plantilla      = club.plantilla.filter(p => p.id !== myPlayerId);
  rival.plantilla     = rival.plantilla.filter(p => p.id !== rivalPlayerId);
  rivP.goles = 0; rivP.asistencias = 0; rivP.partidos = 0;
  myP.goles  = 0; myP.asistencias  = 0; myP.partidos  = 0;
  club.plantilla.push(rivP);
  rival.plantilla.push(myP);
  state.alineacion = autoSelectLineup(club, state.tactica.sistema);
  logTransfer(state, { kind: 'intercambio', playerNombre: `${rivP.nombre} ${rivP.apellido}`, clubNombre: rival.nombre, importe: Math.abs(diferencia), contrapartidaNombre: `${myP.nombre} ${myP.apellido}` });

  await save(req.userId!, slot, state);
  return res.json({
    aceptado: true,
    mensaje: `Intercambio completado: ${myP.nombre} → ${rival.nombre} / ${rivP.nombre} → ${club.nombre}`,
    presupuesto: club.presupuesto,
  });
});

// POST /api/market/:slot/renovar — contract renewal
marketRouter.post('/:slot/renovar', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const { playerId, salario, anios, clausula } = req.body as {
    playerId: string; salario: number; anios: number; clausula: number;
  };

  const club   = myClub(state);
  const player = club.plantilla.find(p => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });

  // Player accepts if salary >= their demand (15-25% raise)
  const minSalario = Math.round(player.salario * (1.10 + Math.random() * 0.15));
  if (salario < minSalario) {
    return res.json({ aceptado: false, mensaje: `Pide al menos ${Math.round(minSalario/1000)}K€/sem`, minSalario });
  }

  const costeAnticipo = Math.round(player.salario * 4); // signing bonus = 1 month
  if (club.presupuesto < costeAnticipo) {
    return res.status(400).json({ error: `Necesitas ${Math.round(costeAnticipo/1000)}K€ para el bonus de firma` });
  }

  club.presupuesto       -= costeAnticipo;
  // F2-3: cláusula alta implica salario mínimo mayor
  const clausulaMult = clausula > player.valor * 5 ? 1.15 : clausula > player.valor * 3 ? 1.05 : 1.0;
  const salarioFinal = Math.max(salario, Math.round(minSalario * clausulaMult));
  player.salario          = salarioFinal;
  player.contrato         = anios;
  player.clausula         = clausula ?? Math.round(player.valor * 4);
  player.moral            = Math.min(100, player.moral + 15);
  player.emocion          = 'feliz';

  // Mark any pending renewal event as resolved
  state.eventosActivos = state.eventosActivos.map(e =>
    e.titulo.includes(player.nombre) ? { ...e, resuelto: true } : e
  );

  await save(req.userId!, slot, state);
  return res.json({ aceptado: true, player, presupuesto: club.presupuesto });
});

// GET /api/market/:slot/expiring — players with contract expiring
marketRouter.get('/:slot/expiring', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const club      = myClub(state);
  const expiring  = club.plantilla
    .filter(p => p.contrato <= 1)
    .sort((a, b) => b.media - a.media)
    .map(p => ({
      ...p,
      salarioMinimo: Math.round(p.salario * 1.15),
      clausulaSugerida: Math.round(p.valor * rnd(3, 5)),
    }));
  return res.json(expiring);
});

function rnd(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ─────────────────────────────────────────────────────────────
// TRAINING
// ─────────────────────────────────────────────────────────────

export const trainingRouter = Router();
trainingRouter.use(authMiddleware);

trainingRouter.post('/:slot/session', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const { tipo, playerIds } = req.body as { tipo: string; playerIds: string[] };
  const club       = myClub(state);

  // F2-5: máx 1 sesión de entrenamiento por jornada
  // Usamos un campo en state para rastrear la última jornada entrenada
  const ultimoEntrenamiento = state.ultimoEntrenamientoJornada ?? -1;
  if (ultimoEntrenamiento >= state.jornada) {
    return res.status(400).json({ error: `Ya entrenaste esta jornada (J${state.jornada}). El próximo entrenamiento será en J${state.jornada + 1}` });
  }
  state.ultimoEntrenamientoJornada = state.jornada;

  const entrenador = club.staff.find(s => s.rol === 'entrenador');
  const entLevel   = entrenador?.nivel ?? 3;
  const { applyTraining } = await import('../simulation/engine');
  const mejoras: { playerId: string; playerName: string; atributo: string; delta: number }[] = [];

  playerIds.forEach(id => {
    const player = club.plantilla.find(p => p.id === id);
    if (!player) return;
    if (player.lesionado) {
      console.log(`[training] ${player.nombre} omitido — lesionado`);
      return;
    }
    const result = applyTraining(player, tipo as any, entLevel);
    if (result.delta !== 0) {
      mejoras.push({ playerId: id, playerName: `${player.nombre} ${player.apellido}`, atributo: result.atributo, delta: result.delta });
    }
  });

  if (entrenador) entrenador.xp = (entrenador.xp || 0) + mejoras.length * 5;
  await save(req.userId!, slot, state);
  return res.json({ mejoras, tipo });
});

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────

export const eventsRouter = Router();
eventsRouter.use(authMiddleware);

eventsRouter.get('/:slot/active', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json(state.eventosActivos.filter(e => !e.resuelto));
});

eventsRouter.post('/:slot/:eventId/resolve', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const { opcionId } = req.body as { opcionId: string };
  const event = state.eventosActivos.find(e => e.id === req.params.eventId);
  if (!event)          return res.status(404).json({ error: 'Evento no encontrado' });
  if (event.resuelto)  return res.status(400).json({ error: 'Evento ya resuelto' });

  const club   = myClub(state);
  const result = resolveEvent(event, opcionId, club);
  if (result.presupuestoDelta) club.presupuesto += result.presupuestoDelta;

  // F6-4: registrar promesa de minutos en el estado
  const isMinutosPromise = (
    (event.tipo === 'conflicto' && event.titulo.includes('minutos') && opcionId === 'a') ||
    (event.tipo === 'solicitud_salida' && opcionId === 'hablar')
  );
  if (isMinutosPromise) {
    const rawName = event.tipo === 'solicitud_salida'
      ? event.titulo.replace(' exige salir', '').trim()
      : event.titulo.split(' pide')[0].trim();
    const player = club.plantilla.find(p =>
      `${p.nombre} ${p.apellido}` === rawName || p.nombre === rawName
    );
    if (player) {
      const promesa = {
        playerId: player.id, playerNombre: `${player.nombre} ${player.apellido}`,
        jornadaPromesa: state.jornada, jornadaLimite: state.jornada + 5,
        partidosJugados: 0, minPartidos: 3, cumplida: false, caducada: false,
      };
      state.promesasMinutos = [
        ...(state.promesasMinutos ?? []).filter(pm => pm.playerId !== player.id),
        promesa,
      ];
    }
  }

  // Handle contract renewal via event
  if (event.titulo.includes('quiere renovar') && opcionId === 'renovar') {
    const playerName = event.titulo.replace(' quiere renovar', '').trim();
    const player = club.plantilla.find(p => `${p.nombre} ${p.apellido}` === playerName);
    if (player) {
      player.salario  = Math.round(player.salario * 1.2);
      player.contrato = 3;
      player.moral    = Math.min(100, player.moral + 15);
      player.emocion  = 'feliz';
    }
  }

  if (event.titulo.includes('quiere renovar') && opcionId === 'libre') {
    const playerName = event.titulo.replace(' quiere renovar', '').trim();
    const player = club.plantilla.find(p => `${p.nombre} ${p.apellido}` === playerName);
    if (player) {
      player.contrato = 0; // will leave end of season
      player.emocion  = 'neutral';
    }
  }

  event.resuelto = true;
  state.eventosResueltos.push(event.id);
  console.log(`[event] slot=${slot} J${state.jornada} resuelto: "${event.titulo}" → opción=${opcionId}`);
  await save(req.userId!, slot, state);
  return res.json({ ok: true, descripcion: result.descripcionResultado, presupuestoDelta: result.presupuestoDelta });
});

// ─────────────────────────────────────────────────────────────
// TRIVIAL
// ─────────────────────────────────────────────────────────────

export const trivialRouter = Router();
trivialRouter.use(authMiddleware);

trivialRouter.get('/:slot/questions', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  if (state.trivialJornada >= state.jornada) {
    return res.status(400).json({ error: 'El trivial de esta jornada ya fue completado' });
  }
  const preguntas = getRandomTrivialSet(state.trivialUsadas, 5);
  return res.json({ preguntas });
});

trivialRouter.post('/:slot/submit', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const { respuestas, questionIds } = req.body as { respuestas: number[]; questionIds: string[] };
  const { TRIVIAL_QUESTIONS } = await import('../utils/trivial');
  const preguntas = questionIds.map(id => TRIVIAL_QUESTIONS.find(q => q.id === id)!).filter(Boolean);
  const correctas = respuestas.map((r, i) => preguntas[i]?.correcta === r ? i : -1).filter(i => i >= 0);
  const xpGanado  = calculateTrivialXP(preguntas, correctas);
  state.xpManager         += xpGanado;
  state.experienciaManager += xpGanado;
  state.trivialJornada     = state.jornada;
  state.trivialUsadas      = [...(state.trivialUsadas ?? []), ...questionIds];
  await save(req.userId!, slot, state);
  return res.json({ correctas: correctas.length, total: preguntas.length, xpGanado, totalXP: state.xpManager });
});

// ─────────────────────────────────────────────────────────────
// LOOT BOXES
// ─────────────────────────────────────────────────────────────

export const lootRouter = Router();
lootRouter.use(authMiddleware);

const LOOT_COSTS: Record<string, number> = {
  bronce: 150, plata: 400, oro: 900, diamante: 2000,
};

lootRouter.get('/:slot', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json({ lootBoxes: state.lootBoxes, xpDisponible: state.xpManager, costes: LOOT_COSTS });
});

lootRouter.post('/:slot/buy', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const { tier } = req.body as { tier: string };
  const cost = LOOT_COSTS[tier];
  if (!cost)                    return res.status(400).json({ error: 'Tier inválido' });
  if (state.xpManager < cost)   return res.status(400).json({ error: 'XP insuficiente' });
  state.xpManager -= cost;
  const box = { id: uuidv4(), tier: tier as any, costXP: cost };
  state.lootBoxes.push(box);
  await save(req.userId!, slot, state);
  return res.json({ box, xpRestante: state.xpManager });
});

lootRouter.post('/:slot/open/:boxId', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const box = state.lootBoxes.find(b => b.id === req.params.boxId);
  if (!box)          return res.status(404).json({ error: 'Loot box no encontrada' });
  if (box.contenido) return res.status(400).json({ error: 'Ya fue abierta' });

  const player = generateLootPlayer(box.tier);
  const allNames = new Set([
    ...state.liga.flatMap(c => c.plantilla.map(p => `${p.nombre} ${p.apellido}`)),
    ...state.mercadoLibre.map(p => `${p.nombre} ${p.apellido}`),
  ]);
  let attempts = 0;
  while (allNames.has(`${player.nombre} ${player.apellido}`) && attempts < 5) {
    player.apellido += String(Math.floor(Math.random() * 99));
    attempts++;
  }
  box.contenido = player;
  state.mercadoLibre.push({ ...player, enVenta: false });
  await save(req.userId!, slot, state);
  return res.json({ player, tier: box.tier });
});

lootRouter.post('/:slot/sign/:playerId', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);

  // Loot signing uses window gate too
  if (!isWindowOpen(state)) {
    return res.status(400).json({ error: windowClosedError(state) });
  }

  const club   = myClub(state);
  const player = state.mercadoLibre.find(p => p.id === req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });

  const bonus = Math.round(player.valor * 0.1);
  if (club.presupuesto < bonus) {
    return res.status(400).json({ error: `Necesitas ${Math.round(bonus/1000)}K€ para firmar` });
  }

  if (player.nacionalidad === 'EX') {
    const extra = club.plantilla.filter(p => p.nacionalidad === 'EX').length;
    if (extra >= 3) return res.status(400).json({ error: 'Límite de extracomunitarios alcanzado' });
  }

  club.presupuesto -= bonus;
  club.plantilla.push(player);
  state.mercadoLibre  = state.mercadoLibre.filter(p => p.id !== player.id);
  state.alineacion    = autoSelectLineup(club, state.tactica.sistema);
  await save(req.userId!, slot, state);
  return res.json({ ok: true, player, presupuesto: club.presupuesto });
});
