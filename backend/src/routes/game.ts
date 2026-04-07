import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/errorHandler';
import {
  createNewGame, autoSelectLineup, startWork,
  processPendingWorks, updateLeagueTable, applyJornadaFinances,
  startNewSeason, getStandings, SPONSORS,
} from '../services/gameService';
import type { GameState, Club } from '../../../shared/types/index';

export const gameRouter = Router();
gameRouter.use(authMiddleware);

// ── Helper: parse state ───────────────────────────────────────

function parseState(raw: string): GameState {
  const s = JSON.parse(raw) as GameState;
  return normalizeState(s);
}

// F8-6: Rellena campos que pueden faltar en saves de versiones anteriores
function normalizeState(s: any): GameState {
  // Campos de F4
  s.jornadasEnDeficit    = s.jornadasEnDeficit    ?? 0;
  s.bloqueadoPorDeuda    = s.bloqueadoPorDeuda    ?? false;
  s.advertenciaDirectiva = s.advertenciaDirectiva ?? false;

  // Campos de F5
  s.historialResultados       = s.historialResultados       ?? [];
  s.historialTransferencias   = s.historialTransferencias   ?? [];
  s.recomendacionesPostPartido = s.recomendacionesPostPartido ?? [];
  s.scoutRequests             = s.scoutRequests             ?? [];

  // Campos de F6
  s.promesasMinutos           = s.promesasMinutos           ?? [];
  s.presupuestoInicioTemporada = s.presupuestoInicioTemporada ?? 0;

  // Campos de jugadores que pueden faltar en saves antiguas
  if (Array.isArray(s.liga)) {
    s.liga.forEach((club: any) => {
      if (Array.isArray(club.plantilla)) {
        club.plantilla.forEach((p: any) => {
          p.convocado         = p.convocado         ?? false;
          p.convocadoJornadas = p.convocadoJornadas ?? 0;
          p.experiencia       = p.experiencia       ?? 0;
          p.tendencia         = p.tendencia         ?? 'stable';
          p.notaUltimoPartido = p.notaUltimoPartido ?? 0;
          p.jornadasSinJugar  = p.jornadasSinJugar  ?? 0;
          p.mejorasSemana     = p.mejorasSemana     ?? 0;
          p.fatiga            = p.fatiga            ?? 0;
        });
      }
      club.cantera       = club.cantera       ?? [];
      club.obras         = club.obras         ?? [];
    });
  }

  // Evitar NaN en presupuesto
  s.liga?.forEach((club: any) => {
    if (isNaN(club.presupuesto)) club.presupuesto = club.presupuestoInicial ?? 1_000_000;
  });

  return s as GameState;
}

function getMyClub(state: GameState): Club {
  return state.liga.find(c => c.id === state.clubId)!;
}

// ── GET /api/game/saves — list save slots ─────────────────────

gameRouter.get('/saves', async (req: AuthRequest, res: Response) => {
  const saves = await prisma.gameSave.findMany({
    where: { userId: req.userId! },
    select: {
      slot: true, clubNombre: true, temporada: true,
      jornada: true, posicion: true, division: true,
      updatedAt: true, id: true,
    },
    orderBy: { slot: 'asc' },
  });

  // Fill missing slots with empty
  const result = [1, 2, 3, 4].map(slot => {
    const save = saves.find(s => s.slot === slot);
    if (!save) return { slot, vacia: true };
    return { ...save, vacia: false };
  });

  return res.json(result);
});

// ── POST /api/game/new — start new game ───────────────────────

const newGameSchema = z.object({
  slot:           z.number().int().min(1).max(4),
  modo:           z.enum(['manager', 'carrera']),
  clubNombre:     z.string(),
  nombreManager:  z.string().min(2),
});

gameRouter.post('/new', async (req: AuthRequest, res: Response) => {
  const parsed = newGameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { slot, modo, clubNombre, nombreManager } = parsed.data;

  try {
    const state = await createNewGame(modo, clubNombre, nombreManager);
    const club  = getMyClub(state);

    const divClubs = state.liga.filter(c => c.div === club.div).sort((a, b) => b.pts - a.pts);
    const posicion  = divClubs.findIndex(c => c.id === state.clubId) + 1;

    await prisma.gameSave.upsert({
      where:  { userId_slot: { userId: req.userId!, slot } },
      update: {
        state: JSON.stringify(state),
        clubNombre: club.nombre,
        temporada: state.temporada,
        jornada: state.jornada,
        posicion,
        division: club.div,
      },
      create: {
        userId: req.userId!,
        slot,
        state: JSON.stringify(state),
        clubNombre: club.nombre,
        temporada: state.temporada,
        jornada: state.jornada,
        posicion,
        division: club.div,
      },
    });

    return res.status(201).json({ saveId: state.saveId, state });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ── GET /api/game/:slot — load save ──────────────────────────

gameRouter.get('/:slot', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  if (isNaN(slot) || slot < 1 || slot > 4) return res.status(400).json({ error: 'Slot inválido' });

  const save = await prisma.gameSave.findUnique({
    where: { userId_slot: { userId: req.userId!, slot } },
  });

  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  return res.json({ state: parseState(save.state) });
});

// ── PUT /api/game/:slot — save state ─────────────────────────

gameRouter.put('/:slot', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const state: GameState = req.body.state;
  if (!state) return res.status(400).json({ error: 'Estado requerido' });

  const club     = getMyClub(state);
  const standings = getStandings(state.liga, club.div);
  const posicion  = standings.findIndex(c => c.id === state.clubId) + 1;

  await prisma.gameSave.upsert({
    where:  { userId_slot: { userId: req.userId!, slot } },
    update: {
      state: JSON.stringify(state),
      clubNombre: club.nombre,
      temporada: state.temporada,
      jornada: state.jornada,
      posicion,
      division: club.div,
    },
    create: {
      userId: req.userId!,
      slot,
      state: JSON.stringify(state),
      clubNombre: club.nombre,
      temporada: state.temporada,
      jornada: state.jornada,
      posicion,
      division: club.div,
    },
  });

  return res.json({ ok: true });
});

// ── DELETE /api/game/:slot — delete save ─────────────────────

gameRouter.delete('/:slot', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  await prisma.gameSave.deleteMany({
    where: { userId: req.userId!, slot },
  });
  return res.json({ ok: true });
});

// ── POST /api/game/:slot/tactic — update tactic ───────────────

gameRouter.post('/:slot/tactic', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);
  const { sistema, enfoque } = req.body;

  if (sistema) state.tactica.sistema = sistema;
  if (enfoque) state.tactica.enfoque = enfoque;

  // Recalculate auto lineup when system changes
  if (sistema) {
    const club = getMyClub(state);
    state.alineacion = autoSelectLineup(club, sistema);
  }

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  return res.json({ tactica: state.tactica, alineacion: state.alineacion });
});

// ── POST /api/game/:slot/lineup — set lineup ─────────────────

gameRouter.post('/:slot/lineup', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);
  const { alineacion } = req.body as { alineacion: string[] };

  const club = getMyClub(state);

  // Validate: all playerIds must belong to club
  const validIds = new Set(club.plantilla.map(p => p.id));
  if (!alineacion.every(id => validIds.has(id))) {
    return res.status(400).json({ error: 'Alineación contiene jugadores inválidos' });
  }

  // Check extracomunitarios rule: max 3 on field
  const titulares = alineacion.slice(0, 11).map(id => club.plantilla.find(p => p.id === id)!).filter(Boolean);
  const extraCount = titulares.filter(p => p.nacionalidad === 'EX').length;
  if (extraCount > 3) {
    return res.status(400).json({ error: 'Máximo 3 extracomunitarios en el campo' });
  }

  state.alineacion = alineacion;

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  return res.json({ alineacion });
});

// ── POST /api/game/:slot/sponsor — sign sponsor ───────────────

gameRouter.post('/:slot/sponsor', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);
  if (state.patrocinadorFirmado) return res.status(400).json({ error: 'Ya tienes patrocinador firmado esta temporada' });

  const { patrocinadorId } = req.body;
  const sponsor = SPONSORS.find(s => s.id === patrocinadorId);
  if (!sponsor) return res.status(400).json({ error: 'Patrocinador no encontrado' });

  const club = getMyClub(state);
  if (club.rep < sponsor.repMin) {
    return res.status(400).json({ error: `Reputación insuficiente. Necesitas ${sponsor.repMin}` });
  }

  club.patrocinadorId = patrocinadorId;
  club.patrocinio     = Math.round(club.patrocinioBase * sponsor.mult);
  state.patrocinadorFirmado = true;

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  return res.json({ ok: true, patrocinio: club.patrocinio, sponsor: sponsor.nombre });
});

// ── POST /api/game/:slot/work — start construction work ───────

gameRouter.post('/:slot/work', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);
  const { tipo } = req.body as { tipo: string };
  const club = getMyClub(state);

  const result = startWork(club, tipo);
  if (!result.ok) return res.status(400).json({ error: result.error });

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  return res.json({ ok: true, obras: club.obras });
});

// ── POST /api/game/:slot/newseason — start next season ────────

gameRouter.post('/:slot/newseason', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state   = parseState(save.state);
  const newState = await startNewSeason(state);
  const club     = newState.liga.find(c => c.id === newState.clubId)!;

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: {
      state: JSON.stringify(newState),
      temporada: newState.temporada,
      jornada: newState.jornada,
      division: club.div,
    },
  });

  return res.json({ state: newState });
});

// ── GET /api/game/:slot/clubs — club list for team select ─────

gameRouter.get('/:slot/clubs', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);
  const clubs = state.liga.map(c => ({
    id: c.id, nombre: c.nombre, div: c.div, rep: c.rep,
    escudo: c.escudo, colores: c.colores,
    capacidad: c.stadium.capacidad, objetivo: c.objetivo,
    presupuesto: c.presupuesto,
  }));

  return res.json(clubs);
});

// ── POST /api/game/:slot/cesion — loan player ─────────────────

gameRouter.post('/:slot/cesion', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state   = parseState(save.state);
  const { playerId, rivalClubId, jornadas, tarifaCesion } = req.body as { playerId: string; rivalClubId: string; jornadas: number; tarifaCesion: number };
  const club    = getMyClub(state);
  const player  = club.plantilla.find(p => p.id === playerId);
  const destino = state.liga.find(c => c.id === rivalClubId);

  if (!player)  return res.status(404).json({ error: 'Jugador no encontrado' });
  if (!destino) return res.status(404).json({ error: 'Club destino no encontrado' });
  if (player.enCesion) return res.status(400).json({ error: 'El jugador ya está cedido' });

  // IA acepta si el jugador encaja en su plantilla
  const samePos = destino.plantilla.filter(p => p.pos === player.pos).length;
  const aiAcepta = samePos < 6 && Math.random() < 0.65;
  if (!aiAcepta) return res.json({ aceptado: false, mensaje: 'El club rechaza la cesión.' });

  // Execute cesion
  club.presupuesto    += tarifaCesion ?? 0;
  player.enCesion      = true;
  player.clubCesionId  = rivalClubId;
  destino.plantilla.push({ ...player, enCesion: true, clubCesionId: club.id });
  club.plantilla = club.plantilla.filter(p => p.id !== playerId);
  state.alineacion = autoSelectLineup(club, state.tactica.sistema);

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  const msg = player.nombre + ' ' + player.apellido + ' cedido a ' + destino.nombre;
  return res.json({ aceptado: true, mensaje: msg });
});

// ── GET /api/game/:slot/history — season history ──────────────

gameRouter.get('/:slot/history', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });
  const state = parseState(save.state);
  return res.json(state.historialTemporadas ?? []);
});

// ── GET /api/game/:slot/cantera ────────────────────────────────

gameRouter.get('/:slot/cantera', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });
  const state = parseState(save.state);
  const club  = getMyClub(state);
  return res.json(club.cantera ?? []);
});

// ── POST /api/game/:slot/iniciarliga — transition preseason → liga ────

gameRouter.post('/:slot/iniciarliga', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);

  // Allow both pretemporada and amistosos phases
  if (state.fase !== 'pretemporada' && state.fase !== 'amistosos') {
    return res.status(400).json({ error: `No puedes iniciar la liga en fase: ${state.fase}` });
  }

  // Robust sponsor check — accept any sign of sponsor being set
  const myClub = state.liga.find((c: any) => c.id === state.clubId);
  const sponsorOk =
    !!state.patrocinadorFirmado ||
    !!(myClub?.patrocinadorId && myClub.patrocinadorId !== '') ||
    (myClub?.patrocinio ?? 0) > 0;

  if (!sponsorOk) {
    return res.status(400).json({ error: 'Debes firmar un patrocinador antes de iniciar la liga' });
  }

  // Transition to liga
  state.patrocinadorFirmado = true; // ensure flag is set
  state.fase    = 'liga';
  state.jornada = 1;

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data:  { state: JSON.stringify(state), jornada: 1 },
  });

  // Return full state so the store can apply it directly without a second fetch
  return res.json({ ok: true, fase: state.fase, state });
});

// ── POST /api/game/:slot/upgrade — gastar XP + dinero para mejorar jugador ──
// F3-2: Gastar XP + dinero para mejorar atributos de jugador

gameRouter.post('/:slot/upgrade', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state = parseState(save.state);
  const { playerId, atributo } = req.body as { playerId: string; atributo: 'media' | 'fisico' | 'forma' | 'moral' };
  const club   = getMyClub(state);
  const player = club.plantilla.find(p => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado. Puede que haya sido vendido o cedido.' });

  // Costes según atributo
  // F7-2: costes de upgrade más ajustados para evitar progresión rápida
  // Media escala con la media actual del jugador (más caro si ya es bueno)
  const mediaActual = player.media;
  const mediaMultiplier = mediaActual >= 80 ? 3.0 : mediaActual >= 70 ? 1.8 : 1.0;
  const COSTES: Record<string, { xp: number; dinero: number; max: number }> = {
    media:  { xp: Math.round(600  * mediaMultiplier), dinero: Math.round(800_000 * mediaMultiplier), max: player.potencial },  // F8-2: coste base reducido
    fisico: { xp: 250,  dinero: 200_000,  max: 99 },
    forma:  { xp: 120,  dinero:  80_000,  max: 99 },
    moral:  { xp:  80,  dinero:  30_000,  max: 99 },
  };
  const coste = COSTES[atributo];
  if (!coste) return res.status(400).json({ error: 'Atributo no válido' });

  // Validar recursos
  if (state.xpManager < coste.xp)      return res.status(400).json({ error: `Necesitas ${coste.xp} XP (tienes ${state.xpManager})` });
  if (club.presupuesto < coste.dinero) return res.status(400).json({ error: `Necesitas ${(coste.dinero/1000).toFixed(0)}K€ en presupuesto` });

  const valorActual = player[atributo as keyof typeof player] as number;
  if (valorActual >= coste.max) {
    const limit = atributo === 'media' ? `su potencial (${player.potencial})` : '99';
    return res.status(400).json({ error: `${player.nombre} ya está al máximo posible en ${atributo} (límite: ${limit})` });
  }

  // Aplicar mejora
  state.xpManager    -= coste.xp;
  club.presupuesto   -= coste.dinero;
  (player as any)[atributo] = Math.min(coste.max, valorActual + 1);

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  return res.json({
    ok: true,
    atributo,
    valorAntes: valorActual,
    valorAhora: (player as any)[atributo],
    xpRestante: state.xpManager,
    presupuesto: club.presupuesto,
  });
});

// ── POST /api/game/:slot/staffupgrade — subir nivel de staff con XP ──
// F3-3: Subir nivel de staff con XP + dinero

gameRouter.post('/:slot/staffupgrade', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const save = await prisma.gameSave.findUnique({ where: { userId_slot: { userId: req.userId!, slot } } });
  if (!save) return res.status(404).json({ error: 'Partida no encontrada' });

  const state  = parseState(save.state);
  const { staffId } = req.body as { staffId: string };
  const club   = getMyClub(state);
  const member = club.staff.find(s => s.id === staffId);
  if (!member) return res.status(404).json({ error: 'Miembro del staff no encontrado' });
  if (member.nivel >= 10) return res.status(400).json({ error: 'Ya está al nivel máximo (10)' });

  // Coste escalonado: más caro a niveles altos
  const xpCoste     = member.nivel * 300;
  const dineroCoste = member.nivel * 200_000;

  if (state.xpManager < xpCoste)      return res.status(400).json({ error: `Necesitas ${xpCoste} XP (tienes ${state.xpManager})` });
  if (club.presupuesto < dineroCoste) return res.status(400).json({ error: `Necesitas ${(dineroCoste/1000).toFixed(0)}K€` });

  state.xpManager  -= xpCoste;
  club.presupuesto -= dineroCoste;
  member.nivel++;
  member.salario    = Math.round(member.salario * 1.15); // subida de sueldo

  await prisma.gameSave.update({
    where: { userId_slot: { userId: req.userId!, slot } },
    data: { state: JSON.stringify(state) },
  });

  return res.json({
    ok: true,
    nivelAntes: member.nivel - 1,
    nivelAhora: member.nivel,
    xpRestante: state.xpManager,
    presupuesto: club.presupuesto,
  });
});
