/**
 * AI TRANSFER ENGINE
 * Simulates realistic transfer activity between CPU clubs.
 * Runs each jornada. Generates news feed entries.
 */

import type { Club, Player, GameState, ScoutReport } from '../../../shared/types/index';
import { isWindowOpen } from '../utils/transferWindow';

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── AI decides to sell ────────────────────────────────────────

function aiWantsToSell(club: Club, player: Player): boolean {
  // F6-2: decisión de venta más realista
  const samePos  = club.plantilla.filter(p => p.pos === player.pos).length;
  const posLimit = player.pos === 'POR' ? 3 : player.pos === 'DEF' ? 8 : 7;

  // Exceso de posición
  if (samePos > posLimit) return Math.random() < 0.35;

  // Jugador enfadado → alta prioridad de venta
  if (player.emocion === 'enfadado' || player.emocion === 'conflicto') return Math.random() < 0.65;

  // Contrato expirando + media suficiente → vender antes de perderle libre
  if (player.contrato <= 1 && player.media >= 68) return Math.random() < 0.55;

  // Mayor de 32 con decline → renovarlo no tiene ROI
  if (player.edad >= 32 && player.tendencia === 'down') return Math.random() < 0.40;

  // Bajo rendimiento sostenido (forma baja + mayor de 30)
  if (player.forma < 40 && player.edad > 30) return Math.random() < 0.30;

  // Potencial bajo ya explotado (media ≥ potencial y mayor de 28)
  if (player.edad > 28 && player.media >= player.potencial - 2) return Math.random() < 0.15;

  return false;
}

// ── AI decides to buy ─────────────────────────────────────────

function aiWantsToBuy(buyerClub: Club, player: Player): boolean {
  // F6-2: decisión de compra considerando múltiples factores

  // Presupuesto insuficiente — necesita al menos 90% del valor + salario 26 semanas
  const salaryCost = player.salario * 26;
  if (buyerClub.presupuesto < player.valor * 0.9 + salaryCost) return false;

  // F2-4: límite extracomunitarios
  if (player.nacionalidad === 'EX') {
    const extraCount = buyerClub.plantilla.filter(p => p.nacionalidad === 'EX').length;
    if (extraCount >= 3) return false;
  }

  // No fichar mayores de 34 (salvo POR)
  if (player.edad > 34 && player.pos !== 'POR') return false;

  // No fichar si salario supera el 15% del presupuesto anual (wage cap básico)
  const wageBudget = buyerClub.presupuesto * 0.15;
  const currentWages = buyerClub.plantilla.reduce((s, p) => s + p.salario, 0);
  if (currentWages + player.salario > wageBudget * 52) return false;

  const samePos   = buyerClub.plantilla.filter(p => p.pos === player.pos).length;
  const minPos    = player.pos === 'POR' ? 1 : player.pos === 'DEF' ? 3 : 3;
  const bestInPos = buyerClub.plantilla.filter(p => p.pos === player.pos).sort((a,b) => b.media-a.media)[0];

  // Necesidad urgente de posición
  if (samePos < minPos) return true;

  // Mejora significativa sobre el mejor en esa posición
  const mejora = player.media - (bestInPos?.media ?? 0);
  if (mejora >= 8) return Math.random() < 0.65;
  if (mejora >= 5) return Math.random() < 0.40;

  // Potencial alto + joven → inversión futura
  if (player.edad <= 22 && player.potencial >= 85) return Math.random() < 0.35;

  return false;
}

// ── Price negotiation ─────────────────────────────────────────

function negotiatePrice(player: Player, sellerClub: Club, buyerClub: Club): number {
  // F6-2: precio más realista considerando potencial, contrato y necesidad
  const base = player.valor;

  // Multiplicador vendedor
  const sellerMult =
    player.emocion   === 'feliz'    ? 1.15 :
    player.emocion   === 'enfadado' ? 0.82 :
    player.contrato  <= 1           ? 0.90 : // urgencia de venta
    1.0;

  // Multiplicador comprador
  const ageMult     = player.edad > 32 ? 0.85 : player.edad > 29 ? 0.95 : 1.0;
  const formMult    = player.forma < 50 ? 0.88 : 1.0;
  const potMult     = player.potencial >= 85 && player.edad <= 23 ? 1.15 : 1.0;

  // Varianza de mercado ±10%
  const variance    = 0.93 + Math.random() * 0.14;

  // F7-3c: ajuste por presupuesto relativo de clubs
  const richBuyerPremium  = buyerClub.presupuesto > 50_000_000 ? 1.08 : 1.0;
  const poorSellerDiscount = sellerClub.presupuesto < 2_000_000 ? 0.90 : 1.0;

  return Math.round(base * sellerMult * ageMult * formMult * potMult * variance * richBuyerPremium * poorSellerDiscount);
}

// ── Process AI transfers for one jornada ─────────────────────

export interface AITransferResult {
  bajas:  { clubNombre: string; playerNombre: string; precio: number }[];
  fichas: { clubNombre: string; playerNombre: string; precio: number }[];
}

export function processAITransfers(
  state: GameState,
  myClubId: string,
): AITransferResult {
  const result: AITransferResult = { bajas: [], fichas: [] };

  // Only run during open transfer windows
  if (!isWindowOpen(state)) return result;

  // Only run AI transfers ~30% of jornadas (not every week)
  if (Math.random() > 0.45) return result;  // F7-3: más actividad IA

  const cpuClubs = state.liga.filter(c => c.id !== myClubId);
  if (cpuClubs.length < 2) return result;

  // Pick a random seller and a random buyer from different clubs
  const seller = pick(cpuClubs);
  const buyer  = pick(cpuClubs.filter(c => c.id !== seller.id));

  // Find a player the seller wants to offload
  const candidates = seller.plantilla
    .filter(p => !p.lesionado && !p.enVenta && p.edad < 34)
    .filter(p => aiWantsToSell(seller, p));

  if (candidates.length === 0) return result;
  const player = pick(candidates);

  // Check if buyer wants him
  if (!aiWantsToBuy(buyer, player)) return result;

  // Negotiate
  const precio = negotiatePrice(player, seller, buyer);
  if (buyer.presupuesto < precio) return result;

  // Execute transfer
  buyer.presupuesto  -= precio;
  seller.presupuesto += precio;
  seller.plantilla    = seller.plantilla.filter(p => p.id !== player.id);
  player.goles = 0; player.asistencias = 0; player.partidos = 0;
  buyer.plantilla.push(player);

  result.bajas.push({  clubNombre: seller.nombre, playerNombre: `${player.nombre} ${player.apellido}`, precio });
  result.fichas.push({ clubNombre: buyer.nombre,  playerNombre: `${player.nombre} ${player.apellido}`, precio });

  // F7-3b: cesión de joven de club grande a pequeño (30% adicional)
  if (Math.random() < 0.30) {
    const bigClub   = pick(cpuClubs.filter(c => c.div === 0 && c.id !== buyer.id));
    const smallClub = pick(cpuClubs.filter(c => c.div > 0 && c.id !== seller.id));
    if (bigClub && smallClub) {
      const youngBench = bigClub.plantilla.filter(p =>
        p.edad <= 22 && p.partidos < 5 && !p.lesionado && !p.enCesion
      );
      if (youngBench.length > 0) {
        const y = pick(youngBench);
        y.enCesion     = true;
        y.clubCesionId = smallClub.id;
        smallClub.plantilla.push({ ...y });
        result.fichas.push({ clubNombre: smallClub.nombre, playerNombre: `${y.nombre} ${y.apellido}`, precio: 0 });
      }
    }
  }

  return result;
}

// ── Cantera development ───────────────────────────────────────

export function developCantera(club: Club): Player | null {
  if (!club.cantera || club.cantera.length === 0) return null;

  // Tick development
  club.cantera.forEach(c => { c.jornadasDesarrollo = (c.jornadasDesarrollo || 0) + 1; });

  // Graduate players ready (after 10+ jornadas of development)
  const ready = club.cantera.find(c => c.jornadasDesarrollo >= 10 && c.descubierto);
  if (!ready) return null;

  // Convert to full player
  const graduated: Player = {
    id: ready.id,
    nombre: ready.nombre,
    apellido: ready.apellido,
    edad: ready.edad,
    pos: ready.pos,
    nacionalidad: 'ES',
    pais: 'ES',
    media: Math.round(ready.potencial * 0.7) + rnd(-3, 3),
    potencial: ready.potencial,
    forma: rnd(60, 80),
    fisico: rnd(70, 85),
    moral: rnd(70, 90),
    experiencia: 0,
    fatiga: 0,
    valor: 0,
    salario: 2000,
    clausula: 500000,
    contrato: 3,
    goles: 0, asistencias: 0, partidos: 0, minutosJugados: 0,
    tarjetas_amarillas: 0, tarjetas_rojas: 0,
    notaMedia: 0, notaUltimoPartido: 0, tendencia: 'stable',
    lesionado: false, lesion_jornadas: 0, lesionTipo: '',
    emocion: 'feliz', enVenta: false, precioVenta: 0, enCesion: false,
    jornadasSinJugar: 0, mediaTemporadas: [], mejorasSemana: 0,
  };
  graduated.valor = Math.round(graduated.media * graduated.media * 1000);

  club.cantera = club.cantera.filter(c => c.id !== ready.id);
  club.plantilla.push(graduated);

  return graduated;
}

// ── Scout: generate report on a random rival player ──────────

export function generateScoutReport(
  state: GameState,
  ojeadorLevel: number,
): ScoutReport | null {
  if (ojeadorLevel < 2) return null; // need at least level 2

  const cpuClubs = state.liga.filter(c => c.id !== state.clubId);
  if (cpuClubs.length === 0) return null;

  const club   = pick(cpuClubs);
  const player = pick(club.plantilla.filter(p => !p.lesionado));
  if (!player) return null;

  // Accuracy depends on ojeador level
  const accuracy = 0.5 + ojeadorLevel * 0.05;
  const mediaError    = Math.round((1 - accuracy) * 10 * (Math.random() - 0.5));
  const potencialError = Math.round((1 - accuracy) * 8  * (Math.random() - 0.5));

  const rec: ScoutReport['recomendacion'] =
    player.media >= 78 ? 'fichar' :
    player.media >= 65 ? 'seguir' : 'descartar';

  return {
    id: Math.random().toString(36).slice(2),
    playerId: player.id,
    playerNombre: `${player.nombre} ${player.apellido}`,
    playerClubId: club.id,
    mediaEstimada:    Math.max(40, Math.min(99, player.media + mediaError)),
    potencialEstimado: Math.max(40, Math.min(99, player.potencial + potencialError)),
    recomendacion: rec,
    costeEstimado: Math.round(player.valor * (0.9 + Math.random() * 0.3)),
    jornada: state.jornada,
  };
}

// ── Player fatigue & degradation ──────────────────────────────

export function applyFatigue(club: Club, alineacion: string[]): void {
  const titularIds = new Set(alineacion.slice(0, 11));

  club.plantilla.forEach(p => {
    if (titularIds.has(p.id)) {
      // Titulares acumulan fatiga
      p.fatiga = Math.min(100, (p.fatiga || 0) + rnd(8, 15));
      p.jornadasSinJugar = 0;
    } else {
      // No titulares recuperan algo de fatiga pero pierden forma levemente
      p.fatiga = Math.max(0, (p.fatiga || 0) - rnd(5, 12));
      p.jornadasSinJugar = (p.jornadasSinJugar || 0) + 1;
    }

    // Alta fatiga reduce forma
    if (p.fatiga > 70) {
      p.forma = Math.max(20, p.forma - rnd(1, 3));
    }

    // No jugar muchas jornadas seguidas degrada forma
    if (p.jornadasSinJugar >= 5) {
      p.forma = Math.max(30, p.forma - rnd(1, 2));
      if (p.jornadasSinJugar >= 8) {
        p.emocion = p.emocion === 'neutral' ? 'insatisfecho' : p.emocion;
      }
    }

    // Recuperación natural de fatiga entre semanas
    if (!titularIds.has(p.id)) {
      p.fisico = Math.min(100, p.fisico + rnd(1, 3));
    }
  });
}

// ── Contract renewals ─────────────────────────────────────────

export interface RenewalOffer {
  playerId: string;
  playerName: string;
  salarioActual: number;
  salarioPedido: number;
  contratoAnios: number;
  clausulaPropuesta: number;
  jornada: number;
}

export function checkExpiringContracts(club: Club, jornada: number): RenewalOffer[] {
  // Only check at jornada 10, 20, 30 to avoid spam
  if (jornada % 10 !== 0) return [];

  return club.plantilla
    .filter(p => p.contrato === 1 && p.media >= 65)
    .map(p => ({
      playerId: p.id,
      playerName: `${p.nombre} ${p.apellido}`,
      salarioActual: p.salario,
      salarioPedido: Math.round(p.salario * (1.15 + Math.random() * 0.2)),
      contratoAnios: rnd(2, 4),
      clausulaPropuesta: Math.round(p.valor * rnd(3, 6)),
      jornada,
    }));
}
