import { Router, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/errorHandler';
import { simulateMatch, generateRecommendations } from '../simulation/engine';
import {
  updateLeagueTable, applyJornadaFinances,
  processPendingWorks, autoSelectLineup, getStandings,
} from '../services/gameService';
import { generateRandomEvents } from '../events/gameEvents';
import {
  processAITransfers, applyFatigue, generateScoutReport,
  checkExpiringContracts, developCantera,
} from '../simulation/aiTransfers';
import { playFriendly } from '../simulation/preseason';
import type { GameState, Club, MatchResult } from '../../../shared/types/index';

export const matchRouter = Router();
matchRouter.use(authMiddleware);

function parse(raw: string): GameState {
  const s = JSON.parse(raw) as any;
  // F8-6: normalización defensiva de campos críticos
  s.jornadasEnDeficit     = s.jornadasEnDeficit     ?? 0;
  s.bloqueadoPorDeuda     = s.bloqueadoPorDeuda     ?? false;
  s.historialResultados   = s.historialResultados   ?? [];
  s.historialTransferencias = s.historialTransferencias ?? [];
  s.recomendacionesPostPartido = s.recomendacionesPostPartido ?? [];
  s.scoutRequests         = s.scoutRequests         ?? [];
  s.promesasMinutos       = s.promesasMinutos       ?? [];
  s.liga?.forEach((club: any) => {
    club.cantera = club.cantera ?? [];
    club.plantilla?.forEach((p: any) => {
      p.convocado         = p.convocado         ?? false;
      p.convocadoJornadas = p.convocadoJornadas ?? 0;
      p.experiencia       = p.experiencia       ?? 0;
      p.fatiga            = p.fatiga            ?? 0;
    });
  });
  return s as GameState;
}
function myClub(g: GameState): Club    { return g.liga.find(c => c.id === g.clubId)!; }

async function load(userId: string, slot: number) {
  const s = await prisma.gameSave.findUnique({ where: { userId_slot: { userId, slot } } });
  if (!s) throw new Error('Partida no encontrada');
  return { save: s, state: parse(s.state) };
}

async function persist(userId: string, slot: number, state: GameState) {
  const club = myClub(state);
  const div  = state.liga.filter(c => c.div === club.div).sort((a, b) => b.pts - a.pts);
  const pos  = div.findIndex(c => c.id === state.clubId) + 1;
  await prisma.gameSave.update({
    where: { userId_slot: { userId, slot } },
    data:  { state: JSON.stringify(state), temporada: state.temporada, jornada: state.jornada, posicion: pos, division: club.div },
  });
}

function avgRating(club: Club): number {
  const top = [...club.plantilla].filter(p => !p.lesionado).sort((a,b) => b.media-a.media).slice(0,11);
  return top.length ? Math.round(top.reduce((s,p) => s+p.media, 0)/top.length*10)/10 : 50;
}

// ── POST /api/match/:slot/simulate ────────────────────────────

matchRouter.post('/:slot/simulate', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  let { state } = await load(req.userId!, slot);

  if (state.temporadaTerminada) return res.status(400).json({ error: 'La temporada ya terminó' });
  if (state.fase !== 'liga')    return res.status(400).json({ error: `No puedes simular en fase: ${state.fase}` });

  const jIdx = state.jornada - 1;
  if (jIdx >= state.calendario.length) {
    state.temporadaTerminada = true; state.fase = 'finTemporada';
    await persist(req.userId!, slot, state);
    return res.json({ temporadaTerminada: true });
  }

  const fixtures = state.calendario[jIdx];
  // F8-4: edge case — jornada sin fixtures (no debería ocurrir, pero guard defensivo)
  if (!fixtures || fixtures.length === 0) {
    console.warn(`[simulate] J${state.jornada}: sin fixtures en slot ${slot}`);
    return res.status(400).json({ error: `No hay partidos para la jornada ${state.jornada}. Puede que la temporada haya terminado.` });
  }

  const results: MatchResult[] = [];
  let myResult: MatchResult | null = null;

  for (const fixture of fixtures) {
    const local     = state.liga.find(c => c.id === fixture.localId)!;
    const visitante = state.liga.find(c => c.id === fixture.visitanteId)!;
    if (!local || !visitante) continue;

    const isMyMatch = fixture.localId === state.clubId || fixture.visitanteId === state.clubId;
    const result    = simulateMatch({
      local, visitante, myClubId: state.clubId,
      myAlineacion: isMyMatch ? state.alineacion : [],
      tactica: state.tactica, jornada: state.jornada,
    });

    updateLeagueTable(local,     result.golesLocal,     result.golesVisitante);
    updateLeagueTable(visitante, result.golesVisitante, result.golesLocal);
    applyJornadaFinances(local,     result.golesLocal,     result.golesVisitante, true,  state.calendario.length);
    applyJornadaFinances(visitante, result.golesVisitante, result.golesLocal,     false, state.calendario.length);

    fixture.jugado = true; fixture.resultado = result;
    results.push(result);
    if (isMyMatch) myResult = result;
  }

  const club = myClub(state);

  // Fatigue & degradation
  applyFatigue(club, state.alineacion);

  // Recover injuries + clear reds + process works + cantera
  state.liga.forEach(c => {
    c.plantilla.forEach(p => {
      if (p.lesionado && p.lesion_jornadas > 0) {
        p.lesion_jornadas--;
        if (p.lesion_jornadas === 0) { p.lesionado = false; p.lesionTipo = ''; }
      }
      if (p.tarjetas_rojas > 0) p.tarjetas_rojas = 0;
      // F4-3: decrementar ausencia por convocatoria internacional
      if (p.convocado && p.convocadoJornadas > 0) {
        p.convocadoJornadas--;
        if (p.convocadoJornadas === 0) {
          p.convocado = false;
          p.moral = Math.min(100, p.moral + 5); // vuelve con moral alta
        }
      }
    });
    processPendingWorks(c);
    const oj = c.staff.find(s => s.rol === 'ojeador');
    // F1-4: condición correcta — cantera, no obras
    if (oj && Array.isArray(c.cantera) && c.cantera.length > 0) developCantera(c);
  });

  // AI transfers
  const aiActivity = processAITransfers(state, state.clubId);
  state.ultimasBajas  = [...(state.ultimasBajas  ?? []), ...aiActivity.bajas ].slice(-10);
  state.ultimasFichas = [...(state.ultimasFichas ?? []), ...aiActivity.fichas].slice(-10);

  // Scouting: procesar requests activos (F5-5)
  const ojeador = club.staff.find(s => s.rol === 'ojeador');
  if (ojeador) {
    // Decrementar requests activos y generar informe cuando completan
    const completed: string[] = [];
    state.scoutRequests = (state.scoutRequests ?? []).map((req: any) => {
      const updated = { ...req, jornadasRestantes: req.jornadasRestantes - 1 };
      if (updated.jornadasRestantes <= 0) completed.push(req.id);
      return updated;
    }).filter((req: any) => req.jornadasRestantes > 0);

    for (const reqId of completed) {
      const req = (state.scoutRequests ?? []).find((r: any) => r.id === reqId) ??
        { targetPlayerId: '', targetNombre: '', targetClubId: '' };
      // Buscar jugador y generar informe preciso
      let p: any = null;
      for (const cl of state.liga) {
        p = cl.plantilla.find((pl: any) => pl.id === req.targetPlayerId);
        if (p) break;
      }
      if (p) {
        const accuracy = 0.5 + (ojeador.nivel * 0.05);
        const mediaErr = Math.round((1 - accuracy) * 8 * (Math.random() - 0.5));
        const potErr   = Math.round((1 - accuracy) * 6 * (Math.random() - 0.5));
        const report = {
          id: Math.random().toString(36).slice(2),
          playerId: p.id, playerNombre: `${p.nombre} ${p.apellido}`,
          playerClubId: req.targetClubId,
          mediaEstimada:    Math.max(40, Math.min(99, p.media + mediaErr)),
          potencialEstimado: Math.max(40, Math.min(99, p.potencial + potErr)),
          recomendacion: p.media >= 78 ? 'fichar' : p.media >= 65 ? 'seguir' : 'descartar',
          costeEstimado: Math.round(p.valor * (0.9 + Math.random() * 0.25)),
          jornada: state.jornada,
        };
        state.informesScouting = [...(state.informesScouting ?? []), report].slice(-20);
        ojeador.xp = (ojeador.xp || 0) + 30; // más XP por scouting activo completado
      }
    }

    // Scouting pasivo aleatorio (F5-5: ya existía, mantenido)
    if (ojeador.nivel >= 2 && Math.random() < 0.25) {
      const { generateScoutReport } = await import('../simulation/aiTransfers');
      const report = generateScoutReport(state, ojeador.nivel);
      if (report) {
        state.informesScouting = [...(state.informesScouting ?? []), report].slice(-20);
        ojeador.xp = (ojeador.xp || 0) + 10;
      }
    }
  }

  // Staff XP
  const entrenador = club.staff.find(s => s.rol === 'entrenador');
  if (entrenador) {
    const won = myResult && (myResult.localId === state.clubId ? myResult.golesLocal > myResult.golesVisitante : myResult.golesVisitante > myResult.golesLocal);
    entrenador.xp = (entrenador.xp || 0) + (won ? 25 : 10);
  }

  // Contract warnings
  checkExpiringContracts(club, state.jornada).forEach(r => {
    if (!state.eventosActivos.some(e => e.titulo.includes(r.playerName))) {
      state.eventosActivos.push({
        id: Math.random().toString(36).slice(2),
        tipo: 'conflicto',
        titulo: `${r.playerName} quiere renovar`,
        descripcion: `Contrato termina esta temporada. Pide ${(r.salarioPedido/1000).toFixed(0)}K€/sem durante ${r.contratoAnios} años.`,
        jornada: state.jornada,
        opciones: [
          { id: 'renovar',  texto: `Renovar (${(r.salarioPedido/1000).toFixed(0)}K€/sem)`, efecto: 'Renueva. Moral sube.' },
          { id: 'negociar', texto: 'Negociar a la baja', efecto: 'Posible conflicto.' },
          { id: 'libre',    texto: 'Dejar que se vaya libre', efecto: 'Lo pierdes en verano.' },
        ],
        resuelto: false,
      });
    }
  });

  // Random events
  state.eventosActivos.push(...generateRandomEvents(state, club));

  // F5-6: solicitud formal de salida para jugadores muy descontentos
  club.plantilla.forEach(p => {
    if (p.emocion === 'enfadado' && p.moral < 25 && p.jornadasSinJugar >= 5) {  // F6-1: umbral más estricto
      const yaExiste = state.eventosActivos.some(e =>
        e.tipo === 'solicitud_salida' && e.titulo.includes(p.nombre) && !e.resuelto
      );
      if (!yaExiste) {
        state.eventosActivos.push({
          id: Math.random().toString(36).slice(2),
          tipo: 'solicitud_salida' as any,
          titulo: `${p.nombre} ${p.apellido} exige salir`,
          descripcion: `${p.nombre} está furioso. Lleva ${p.jornadasSinJugar} jornadas sin jugar y su moral es ${p.moral}/100. Exige ser traspasado antes de que acabe el mercado o su rendimiento caerá aún más.`,
          jornada: state.jornada,
          opciones: [
            { id: 'vender',  texto: 'Ponerle a la venta inmediatamente', efecto: 'El jugador se calma. Su precio baja un 15% por la urgencia.' },
            { id: 'hablar',  texto: 'Hablar con él y prometerle minutos', efecto: 'Moral +10. Debes darle al menos 3 partidos en las próximas 5 jornadas.' },
            { id: 'ignorar', texto: 'Ignorar la petición', efecto: 'Emoción pasa a conflicto. Rendimiento -12%. La plantilla ve la situación.' },
          ],
          resuelto: false,
        });
      }
    }
  });

  // Advance jornada
  state.resultados.push(...results);
  state.jornada++;

  if (state.jornada > state.calendario.length) {
    state.temporadaTerminada = true; state.fase = 'finTemporada';
  } else if (state.jornada === state.jornadaInvierno + 1 && state.fase === 'liga') {
    state.fase = 'mercadoInvierno';
  }

  // XP & rep update
  if (myResult) {
    const won = myResult.localId === state.clubId ? myResult.golesLocal > myResult.golesVisitante : myResult.golesVisitante > myResult.golesLocal;
    const drew = myResult.golesLocal === myResult.golesVisitante;
    state.xpManager          += won ? 30 : drew ? 15 : 8;
    state.experienciaManager  += won ? 50 : drew ? 25 : 10;
    state.repManager = Math.min(100, Math.max(0, state.repManager + (won ? 0.5 : drew ? 0 : -0.3)));
  }

  // F4-4: déficit crónico con consecuencias progresivas
  const myClubFin = myClub(state);
  if (myClubFin.presupuesto < 0) {
    state.jornadasEnDeficit = (state.jornadasEnDeficit ?? 0) + 1;
    const deficit    = Math.abs(myClubFin.presupuesto);
    const jornadasD  = state.jornadasEnDeficit;

    // Rep baja 1 punto cada jornada en negativo
    myClubFin.rep = Math.max(0, myClubFin.rep - 1);

    // Jornada 3+ en déficit: advertencia de directiva
    if (jornadasD >= 5 && !state.advertenciaDirectiva) {  // F6-1: margen razonable
      state.advertenciaDirectiva = true;
      state.eventosActivos.push({
        id: Math.random().toString(36).slice(2),
        tipo: 'conflicto',
        titulo: '⚠️ La directiva exige equilibrio financiero',
        descripcion: `Llevas ${jornadasD} jornadas con déficit. Si no mejoras las finanzas en las próximas 5 jornadas, el club tomará medidas.`,
        jornada: state.jornada,
        opciones: [
          { id: 'ok', texto: 'Entendido, tomaré medidas', efecto: 'La directiva espera resultados.' },
        ],
        resuelto: false,
      });
    }

    // Jornada 6+ en déficit: bloqueo de fichajes
    if (jornadasD >= 8) {
      state.bloqueadoPorDeuda = true;  // F6-1: 8 jornadas antes de bloquear
    }

    // Impacto en moral y emoción del vestuario
    if (jornadasD >= 3 || deficit > 10_000_000) {
      myClubFin.plantilla.forEach(p => {
        p.moral = Math.max(20, p.moral - Math.min(5, Math.ceil(jornadasD / 2)));
        if (p.moral < 40 && p.emocion === 'neutral')      p.emocion = 'insatisfecho';
        if (p.moral < 25 && p.emocion === 'insatisfecho') p.emocion = 'enfadado';
      });
    }
  } else {
    // Recuperación: salir del déficit resetea el contador progresivamente
    if ((state.jornadasEnDeficit ?? 0) > 0) {
      state.jornadasEnDeficit = Math.max(0, state.jornadasEnDeficit - 1);
    }
    if (state.jornadasEnDeficit === 0) {
      state.bloqueadoPorDeuda   = false;
      state.advertenciaDirectiva = false;
    }
  }

  state.alineacion = autoSelectLineup(club, state.tactica.sistema);

  // F6-4: procesar promesas de minutos activas
  if ((state.promesasMinutos ?? []).length > 0) {
    const titularesIds = new Set(state.alineacion.slice(0, 11));
    state.promesasMinutos = (state.promesasMinutos ?? []).map(pm => {
      const jugador = club.plantilla.find(p => p.id === pm.playerId);
      if (!jugador) return { ...pm, caducada: true };
      // Contar si jugó de titular este partido
      if (titularesIds.has(pm.playerId)) {
        pm = { ...pm, partidosJugados: pm.partidosJugados + 1 };
      }
      // ¿Se cumplió el mínimo?
      if (pm.partidosJugados >= pm.minPartidos) {
        jugador.moral  = Math.min(100, jugador.moral + 5);
        jugador.emocion = 'feliz';
        return { ...pm, cumplida: true };
      }
      // ¿Expiró el plazo sin cumplir?
      if (state.jornada >= pm.jornadaLimite) {
        jugador.emocion = 'enfadado';
        jugador.moral   = Math.max(0, jugador.moral - 20);
        return { ...pm, caducada: true };
      }
      return pm;
    }).filter(pm => !pm.cumplida && !pm.caducada);
  }

  // F5-1: generar recomendaciones post-partido para el club del usuario
  if (myResult) {
    state.recomendacionesPostPartido = generateRecommendations(club, state.alineacion);
  }

  // F5-2: añadir myResult al historial de resultados de temporada
  if (myResult) {
    state.historialResultados = [...(state.historialResultados ?? []), myResult];
  }

  await persist(req.userId!, slot, state);

  return res.json({
    myResult, allResults: results,
    jornada: state.jornada, fase: state.fase,
    temporadaTerminada: state.temporadaTerminada,
    standings: getStandings(state.liga, club.div),
    aiActivity,
    informesScouting: (state.informesScouting ?? []).slice(-3),
  });
});

// ── GET /api/match/:slot/fixture ──────────────────────────────

matchRouter.get('/:slot/fixture', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  const jIdx = state.jornada - 1;
  const club = myClub(state);
  if (jIdx >= state.calendario.length) return res.json({ fixture: null, temporadaTerminada: true });
  const myFix = state.calendario[jIdx]?.find(f => f.localId === state.clubId || f.visitanteId === state.clubId);
  if (!myFix) return res.json({ fixture: null });
  const rivalId = myFix.localId === state.clubId ? myFix.visitanteId : myFix.localId;
  const rival   = state.liga.find(c => c.id === rivalId);
  return res.json({
    fixture: myFix, isHome: myFix.localId === state.clubId,
    jornada: state.jornada, totalJornadas: state.calendario.length,
    myAvgRating: avgRating(club),
    rival: rival ? { id: rival.id, nombre: rival.nombre, escudo: rival.escudo, colores: rival.colores, rep: rival.rep, avgRating: avgRating(rival) } : null,
  });
});

// ── GET /api/match/:slot/results ──────────────────────────────

matchRouter.get('/:slot/results', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const n    = Math.min(30, parseInt(req.query.n as string ?? '10'));
  const { state } = await load(req.userId!, slot);
  return res.json(state.resultados.filter(r => r.localId === state.clubId || r.visitanteId === state.clubId).slice(-n).reverse());
});

// ── GET /api/match/:slot/news ─────────────────────────────────

matchRouter.get('/:slot/news', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json({ bajas: state.ultimasBajas ?? [], fichas: state.ultimasFichas ?? [], scouting: state.informesScouting ?? [] });
});

// ── POST /api/match/:slot/friendly/:friendlyId ────────────────

matchRouter.post('/:slot/friendly/:friendlyId', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  let { state } = await load(req.userId!, slot);
  if (state.fase !== 'pretemporada' && state.fase !== 'amistosos') {
    return res.status(400).json({ error: 'Solo puedes jugar amistosos en pretemporada' });
  }
  try {
    const { state: newState, resultado, fullResult } = playFriendly(state, req.params.friendlyId);
    await persist(req.userId!, slot, newState);
    console.log(`[friendly] slot=${slot} amistoso ${resultado.gL}-${resultado.gV} vs ${friendly.rivalNombre}`);
    return res.json({ resultado, fullResult, amistososJugados: newState.amistososJugados });
  } catch (e: any) { return res.status(400).json({ error: e.message }); }
});

// ── GET /api/match/:slot/friendlies ──────────────────────────

matchRouter.get('/:slot/friendlies', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json({ amistosos: state.amistosos ?? [], amistososJugados: state.amistososJugados ?? 0 });
});

// ── GET /api/match/:slot/scouting ─────────────────────────────

matchRouter.get('/:slot/scouting', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json(state.informesScouting ?? []);
});

// ── POST /api/match/:slot/scout — iniciar scouting activo ────

matchRouter.post('/:slot/scout', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  let { state } = await load(req.userId!, slot);
  const { targetPlayerId } = req.body as { targetPlayerId: string };

  const ojeador = myClub(state).staff.find(s => s.rol === 'ojeador');
  if (!ojeador || ojeador.nivel < 2) {
    return res.status(400).json({ error: 'Necesitas un ojeador de nivel 2 o superior' });
  }

  // Buscar jugador en clubs CPU
  let targetPlayer: any = null;
  let targetClub: any = null;
  for (const club of state.liga) {
    if (club.id === state.clubId) continue;
    const p = club.plantilla.find((p: any) => p.id === targetPlayerId);
    if (p) { targetPlayer = p; targetClub = club; break; }
  }
  if (!targetPlayer) return res.status(404).json({ error: 'Jugador no encontrado en clubs rivales' });

  // ¿Ya hay un scouting activo de este jugador?
  const yaExiste = (state.scoutRequests ?? []).some((r: any) => r.targetPlayerId === targetPlayerId);
  if (yaExiste) return res.status(400).json({ error: 'Ya estás siguiendo a este jugador' });

  // Coste XP por iniciar seguimiento
  const xpCoste = 50;
  if (state.xpManager < xpCoste) return res.status(400).json({ error: `Necesitas ${xpCoste} XP para iniciar un scouting` });

  state.xpManager -= xpCoste;
  const jornadasObservacion = Math.max(2, 5 - Math.floor(ojeador.nivel / 2)); // mejor ojeador = más rápido

  const request = {
    id: Math.random().toString(36).slice(2),
    targetPlayerId,
    targetNombre: `${targetPlayer.nombre} ${targetPlayer.apellido}`,
    targetClubId: targetClub.id,
    jornadasRestantes: jornadasObservacion,
    iniciada: state.jornada,
  };
  state.scoutRequests = [...(state.scoutRequests ?? []), request];

  await persist(req.userId!, slot, state);
  console.log(`[scout] slot=${slot} J${state.jornada} siguiendo a ${request.targetNombre} (${jornadasObservacion}j)`);
  return res.json({ ok: true, request, jornadasObservacion, xpRestante: state.xpManager });
});

// ── GET /api/match/:slot/scouting/targets — ver scouts activos + completados ──

matchRouter.get('/:slot/scouting/targets', async (req: AuthRequest, res: Response) => {
  const slot = parseInt(req.params.slot);
  const { state } = await load(req.userId!, slot);
  return res.json({
    activos:    (state.scoutRequests ?? []),
    informes:   (state.informesScouting ?? []).slice(-15),
  });
});
