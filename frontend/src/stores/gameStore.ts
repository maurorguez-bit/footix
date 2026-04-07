/**
 * GAME STORE — Zustand
 * Single source of truth for the client.
 * All mutations go through the API; the store mirrors server state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, Club, MatchResult } from '@shared/types/index';

// ── API client ────────────────────────────────────────────────

// En desarrollo: proxy Vite redirige /api → localhost:3001
// En producción: VITE_API_URL apunta al backend desplegado
const API = import.meta.env.VITE_API_URL ?? '/api';

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('fm_token');
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch (networkErr) {
    // F4-5: error de red (sin conexión, backend caído)
    throw new Error('Sin conexión con el servidor. Comprueba que el backend está ejecutándose.');
  }
  if (res.status === 401) {
    // Token expirado — limpiar y redirigir
    localStorage.removeItem('fm_token');
    window.location.href = '/auth';
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Error ${res.status}: ${res.statusText}` }));
    throw new Error(err.error ?? `Error ${res.status}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────

export interface SaveSlotInfo {
  slot: number;
  vacia: boolean;
  clubNombre?: string;
  temporada?: number;
  jornada?: number;
  posicion?: number;
  division?: number;
  updatedAt?: string;
}

export interface SimulateResult {
  myResult: MatchResult | null;
  allResults: MatchResult[];
  jornada: number;
  fase: string;
  temporadaTerminada: boolean;
  standings: Club[];
  eventosNuevos: unknown[];
}

// ── Store ─────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  user: { id: string; email: string; nombre: string } | null;
}

interface GameStore extends AuthState {
  // Auth
  login:    (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nombre: string) => Promise<void>;
  logout:   () => void;

  // Saves
  saves:    SaveSlotInfo[];
  loadSaves: () => Promise<void>;

  // Active game
  slot:     number | null;
  state:    GameState | null;
  lastResult: MatchResult | null;
  simulating: boolean;
  liveActive: boolean;

  // Game actions
  newGame:       (slot: number, modo: 'manager'|'carrera', clubNombre: string, manager: string) => Promise<void>;
  loadGame:      (slot: number) => Promise<void>;
  saveGame:      () => Promise<void>;
  deleteGame:    (slot: number) => Promise<void>;

  // Match
  simulate:      () => Promise<SimulateResult>;
  setLiveActive: (v: boolean) => void;

  // Lineup / Tactic
  setTactic:     (sistema: string, enfoque: string) => Promise<void>;
  setLineup:     (alineacion: string[]) => Promise<void>;

  // Club management
  signSponsor:   (patrocinadorId: string) => Promise<void>;
  startWork:     (tipo: string) => Promise<void>;

  // Market
  getWindow:      () => Promise<unknown>;
  buyPlayer:      (playerId: string, oferta: number) => Promise<{ aceptado: boolean; mensaje?: string }>;
  sellPlayer:     (playerId: string, precio: number) => Promise<{ vendido: boolean; mensaje?: string }>;
  withdrawSale:   (playerId: string) => Promise<void>;
  intercambiar:   (myPlayerId: string, rivalPlayerId: string, rivalClubId: string, diferencia: number) => Promise<unknown>;
  renovarContrato:(playerId: string, salario: number, anios: number, clausula: number) => Promise<unknown>;
  getExpiring:    () => Promise<unknown>;

  // Training
  trainPlayers:  (tipo: string, playerIds: string[]) => Promise<unknown>;

  // Events
  resolveEvent:  (eventId: string, opcionId: string) => Promise<void>;

  // Trivial
  getTrivial:    () => Promise<unknown>;
  submitTrivial: (questionIds: string[], respuestas: number[]) => Promise<{ xpGanado: number }>;

  // Loot
  buyLootBox:    (tier: string) => Promise<unknown>;
  openLootBox:   (boxId: string) => Promise<unknown>;

  // New season
  newSeason:     () => Promise<void>;
  iniciarLiga:   () => Promise<void>;

  // F3-2: upgrade player attribute with XP + money
  upgradePlayer: (playerId: string, atributo: string) => Promise<unknown>;
  // F3-3: upgrade staff level with XP + money
  upgradeStaff:  (staffId: string) => Promise<unknown>;


  // Preseason
  getFriendlies:   () => Promise<unknown>;
  playFriendly:    (friendlyId: string) => Promise<unknown>;

  // News
  getNews:         () => Promise<unknown>;

  // Scouting
  getScouting:         () => Promise<unknown>;
  getScoutingTargets:  () => Promise<unknown>;
  scoutPlayer:         (targetPlayerId: string) => Promise<unknown>;

  // Cesion
  cederJugador:    (playerId: string, rivalClubId: string, jornadas: number, tarifa: number) => Promise<unknown>;

  // History
  getHistory:      () => Promise<unknown>;

  // Cantera
  getCantera:      () => Promise<unknown>;
  // Error
  error: string | null;
  clearError: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // ── Auth state ──
      token: null,
      user:  null,
      error: null,

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        const data = await apiFetch<{ token: string; user: AuthState['user'] }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('fm_token', data.token);
        set({ token: data.token, user: data.user });
      },

      register: async (email, password, nombre) => {
        const data = await apiFetch<{ token: string; user: AuthState['user'] }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, nombre }),
        });
        localStorage.setItem('fm_token', data.token);
        set({ token: data.token, user: data.user });
      },

      logout: () => {
        localStorage.removeItem('fm_token');
        set({ token: null, user: null, state: null, slot: null, saves: [] });
      },

      // ── Save slots ──
      saves: [],
      loadSaves: async () => {
        const saves = await apiFetch<SaveSlotInfo[]>('/game/saves');
        set({ saves });
      },

      // ── Active game ──
      slot:       null,
      state:      null,
      lastResult: null,
      simulating: false,
      liveActive: false,

      newGame: async (slot, modo, clubNombre, manager) => {
        const data = await apiFetch<{ state: GameState }>('/game/new', {
          method: 'POST',
          body: JSON.stringify({ slot, modo, clubNombre, nombreManager: manager }),
        });
        set({ slot, state: data.state, lastResult: null });
        await get().loadSaves();
      },

      loadGame: async (slot) => {
        const data = await apiFetch<{ state: GameState }>(`/game/${slot}`);
        set({ slot, state: data.state, lastResult: null });
      },

      saveGame: async () => {
        const { slot, state } = get();
        if (!slot || !state) return;
        await apiFetch(`/game/${slot}`, {
          method: 'PUT',
          body: JSON.stringify({ state }),
        });
        await get().loadSaves();
      },

      deleteGame: async (slot) => {
        await apiFetch(`/game/${slot}`, { method: 'DELETE' });
        if (get().slot === slot) set({ slot: null, state: null });
        await get().loadSaves();
      },

      // ── Match ──
      simulate: async () => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida activa');
        set({ simulating: true });
        try {
          const result = await apiFetch<SimulateResult>(`/match/${slot}/simulate`, { method: 'POST' });
          // Reload full state after simulation (server mutated it)
          await get().loadGame(slot);
          set({ lastResult: result.myResult, simulating: false });
          return result;
        } catch (e) {
          set({ simulating: false });
          throw e;
        }
      },

      setLiveActive: (v) => set({ liveActive: v }),

      // ── Lineup / Tactic ──
      setTactic: async (sistema, enfoque) => {
        const { slot, state } = get();
        if (!slot || !state) return;
        await apiFetch(`/game/${slot}/tactic`, {
          method: 'POST',
          body: JSON.stringify({ sistema, enfoque }),
        });
        await get().loadGame(slot);
      },

      setLineup: async (alineacion) => {
        const { slot } = get();
        if (!slot) return;
        await apiFetch(`/game/${slot}/lineup`, {
          method: 'POST',
          body: JSON.stringify({ alineacion }),
        });
        set(s => s.state ? { state: { ...s.state, alineacion } } : {});
      },

      // ── Club ──
      signSponsor: async (patrocinadorId) => {
        const { slot } = get();
        if (!slot) return;
        await apiFetch(`/game/${slot}/sponsor`, {
          method: 'POST',
          body: JSON.stringify({ patrocinadorId }),
        });
        // Reload and explicitly ensure flag is set in local state
        await get().loadGame(slot);
        set(s => s.state ? {
          state: { ...s.state, patrocinadorFirmado: true }
        } : {});
      },

      startWork: async (tipo) => {
        const { slot } = get();
        if (!slot) return;
        await apiFetch(`/game/${slot}/work`, {
          method: 'POST',
          body: JSON.stringify({ tipo }),
        });
        await get().loadGame(slot);
      },

      // ── Market ──
      getWindow: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/market/${slot}/window`);
      },

      buyPlayer: async (playerId, oferta) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const data = await apiFetch<{ aceptado: boolean; mensaje?: string }>(
          `/market/${slot}/buy`,
          { method: 'POST', body: JSON.stringify({ playerId, oferta }) }
        );
        if (data.aceptado) await get().loadGame(slot);
        return data;
      },

      sellPlayer: async (playerId, precio) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const data = await apiFetch<{ vendido: boolean; mensaje?: string }>(
          `/market/${slot}/sell`,
          { method: 'POST', body: JSON.stringify({ playerId, precio }) }
        );
        await get().loadGame(slot);
        return data;
      },

      withdrawSale: async (playerId) => {
        const { slot } = get();
        if (!slot) return;
        await apiFetch(`/market/${slot}/sell/${playerId}`, { method: 'DELETE' });
        await get().loadGame(slot);
      },

      intercambiar: async (myPlayerId, rivalPlayerId, rivalClubId, diferencia) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const r = await apiFetch(`/market/${slot}/intercambio`, {
          method: 'POST',
          body: JSON.stringify({ myPlayerId, rivalPlayerId, rivalClubId, diferencia }),
        });
        await get().loadGame(slot);
        return r;
      },

      renovarContrato: async (playerId, salario, anios, clausula) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const r = await apiFetch(`/market/${slot}/renovar`, {
          method: 'POST',
          body: JSON.stringify({ playerId, salario, anios, clausula }),
        });
        await get().loadGame(slot);
        return r;
      },

      getExpiring: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/market/${slot}/expiring`);
      },

      // ── Training ──
      trainPlayers: async (tipo, playerIds) => {
        const { slot } = get();
        if (!slot) return;
        const result = await apiFetch(`/training/${slot}/session`, {
          method: 'POST',
          body: JSON.stringify({ tipo, playerIds }),
        });
        await get().loadGame(slot);
        return result;
      },

      // ── Events ──
      resolveEvent: async (eventId, opcionId) => {
        const { slot } = get();
        if (!slot) return;
        await apiFetch(`/events/${slot}/${eventId}/resolve`, {
          method: 'POST',
          body: JSON.stringify({ opcionId }),
        });
        await get().loadGame(slot);
      },

      // ── Trivial ──
      getTrivial: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/trivial/${slot}/questions`);
      },

      submitTrivial: async (questionIds, respuestas) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const result = await apiFetch<{ xpGanado: number }>(`/trivial/${slot}/submit`, {
          method: 'POST',
          body: JSON.stringify({ questionIds, respuestas }),
        });
        await get().loadGame(slot);
        return result;
      },

      // ── Loot ──
      buyLootBox: async (tier) => {
        const { slot } = get();
        if (!slot) return;
        const result = await apiFetch(`/loot/${slot}/buy`, {
          method: 'POST',
          body: JSON.stringify({ tier }),
        });
        await get().loadGame(slot);
        return result;
      },

      openLootBox: async (boxId) => {
        const { slot } = get();
        if (!slot) return;
        const result = await apiFetch(`/loot/${slot}/open/${boxId}`, { method: 'POST' });
        await get().loadGame(slot);
        return result;
      },


      getFriendlies: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/match/${slot}/friendlies`);
      },

      playFriendly: async (friendlyId) => {
        const { slot } = get();
        if (!slot) return;
        const r = await apiFetch(`/match/${slot}/friendly/${friendlyId}`, { method: 'POST' });
        await get().loadGame(slot);
        return r;
      },

      getNews: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/match/${slot}/news`);
      },

      getScouting: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/match/${slot}/scouting`);
      },

      getScoutingTargets: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/match/${slot}/scouting/targets`);
      },

      scoutPlayer: async (targetPlayerId) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const r = await apiFetch(`/match/${slot}/scout`, {
          method: 'POST', body: JSON.stringify({ targetPlayerId }),
        });
        await get().loadGame(slot);
        return r;
      },

      cederJugador: async (playerId, rivalClubId, jornadas, tarifa) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const r = await apiFetch(`/game/${slot}/cesion`, {
          method: 'POST',
          body: JSON.stringify({ playerId, rivalClubId, jornadas, tarifaCesion: tarifa }),
        });
        await get().loadGame(slot);
        return r;
      },

      getHistory: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/game/${slot}/history`);
      },

      getCantera: async () => {
        const { slot } = get();
        if (!slot) return;
        return apiFetch(`/game/${slot}/cantera`);
      },

      // ── Start league from preseason ──
      iniciarLiga: async () => {
        const { slot } = get();
        if (!slot) return;
        const data = await apiFetch<{ ok: boolean; fase: string; state: GameState }>(
          `/game/${slot}/iniciarliga`,
          { method: 'POST' }
        );
        // Apply state directly from response — no second fetch needed
        if (data.state) {
          set({ state: data.state });
        } else {
          // Fallback: reload from server
          await get().loadGame(slot);
        }
      },

      upgradePlayer: async (playerId, atributo) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const r = await apiFetch(`/game/${slot}/upgrade`, {
          method: 'POST', body: JSON.stringify({ playerId, atributo }),
        });
        await get().loadGame(slot);
        return r;
      },

      upgradeStaff: async (staffId) => {
        const { slot } = get();
        if (!slot) throw new Error('No hay partida');
        const r = await apiFetch(`/game/${slot}/staffupgrade`, {
          method: 'POST', body: JSON.stringify({ staffId }),
        });
        await get().loadGame(slot);
        return r;
      },

      // ── New season ──
      newSeason: async () => {
        const { slot } = get();
        if (!slot) return;
        const data = await apiFetch<{ state: GameState }>(`/game/${slot}/newseason`, { method: 'POST' });
        set({ state: data.state, lastResult: null });
        await get().loadSaves();
      },
    }),
    {
      name: 'fm-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);

// ── Derived selectors ─────────────────────────────────────────

export const useMyClub = () =>
  useGameStore(s => s.state?.liga.find(c => c.id === s.state?.clubId) ?? null);

export const useStandings = () =>
  useGameStore(s => {
    if (!s.state) return [];
    const club = s.state.liga.find(c => c.id === s.state!.clubId);
    if (!club) return [];
    return [...s.state.liga]
      .filter(c => c.div === club.div)
      .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));
  });

export const useMyPosition = () =>
  useGameStore(s => {
    const standings = [...(s.state?.liga ?? [])]
      .filter(c => c.div === s.state?.liga.find(x => x.id === s.state?.clubId)?.div)
      .sort((a, b) => b.pts - a.pts);
    return standings.findIndex(c => c.id === s.state?.clubId) + 1;
  });
