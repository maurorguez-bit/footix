// ============================================================
// SHARED TYPES v2.1 — frontend + backend
// ============================================================

export type Division    = 0 | 1 | 2;
export type Position    = 'POR' | 'DEF' | 'MED' | 'DEL';
export type Nationality = 'ES' | 'EU' | 'EX';
export type Emotion     = 'feliz' | 'neutral' | 'insatisfecho' | 'enfadado' | 'conflicto';
export type TrainingType = 'fisico' | 'tecnico' | 'tactico' | 'recuperacion';
export type TacticFocus = 'defensivo' | 'equilibrado' | 'ofensivo';
export type GamePhase   = 'pretemporada' | 'amistosos' | 'liga' | 'mercadoInvierno' | 'finTemporada';
export type LootBoxTier = 'bronce' | 'plata' | 'oro' | 'diamante';
export type TransferType = 'compra' | 'venta' | 'cesion' | 'libre' | 'intercambio';
export type StaffRole   = 'entrenador' | 'ojeador' | 'fisio' | 'ayudante' | 'preparador';
export type EventType   = 'lesion' | 'enfermedad' | 'convocatoria' | 'conflicto' | 'concierto' | 'climatico' | 'solicitud_salida';
export type WorkType    = 'aforo5' | 'aforo15' | 'aforo30' | 'tienda' | 'parking' | 'inst' | 'bar' | 'vestuarios';
export type Trend       = 'up' | 'stable' | 'down';

// ── Player ────────────────────────────────────────────────────

export interface Player {
  id: string;
  nombre: string;
  apellido: string;
  edad: number;
  pos: Position;
  nacionalidad: Nationality;
  pais: string;

  media: number;
  potencial: number;
  forma: number;
  fisico: number;
  moral: number;
  experiencia: number;
  fatiga: number;         // 0-100 (acumulada entre jornadas)

  valor: number;
  salario: number;
  clausula: number;
  contrato: number;

  goles: number;
  asistencias: number;
  partidos: number;
  minutosJugados: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  notaMedia: number;
  notaUltimoPartido: number;
  tendencia: Trend;

  lesionado: boolean;
  lesion_jornadas: number;
  lesionTipo: string;
  emocion: Emotion;
  enVenta: boolean;
  precioVenta: number;
  enCesion: boolean;
  clubCesionId?: string;
  jornadasSinJugar: number;
  convocado: boolean;         // F4-3: convocatoria internacional activa
  convocadoJornadas: number;  // jornadas que falta (decrementa cada jornada)

  mediaTemporadas: number[];
  mejorasSemana: number;
}

// ── Staff ─────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  nombre: string;
  rol: StaffRole;
  nivel: number;
  experiencia: number;
  xp: number;             // XP acumulado esta temporada
  salario: number;
  contrato: number;
}

// ── Stadium ───────────────────────────────────────────────────

export interface Stadium {
  nombre: string;
  capacidad: number;
  instalaciones: number;
  tienda: boolean;
  parking: boolean;
  bar: boolean;
  vestuarios: number;
  entradas_precio: number;
  bar_precio: number;
  tienda_revenue_mult: number;
}

// ── Work ──────────────────────────────────────────────────────

export interface Work {
  id: string;
  tipo: WorkType;
  label: string;
  jornadasRestantes: number;
  coste: number;
  startedAt: number;
}

// ── Cantera ───────────────────────────────────────────────────

export interface CanteraPlayer {
  id: string;
  nombre: string;
  apellido: string;
  edad: number;
  pos: Position;
  potencial: number;      // hidden until scouted
  descubierto: boolean;
  jornadasDesarrollo: number;
}

// ── Club ──────────────────────────────────────────────────────

export interface Club {
  id: string;
  nombre: string;
  div: Division;
  rep: number;
  objetivo: string;
  presupuesto: number;
  presupuestoInicial: number;
  patrocinioBase: number;
  patrocinio: number;
  patrocinadorId: string;
  patrocinadorFirmado: boolean;

  plantilla: Player[];
  staff: StaffMember[];
  stadium: Stadium;
  obras: Work[];
  cantera: CanteraPlayer[];

  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; pts: number;
  forma: ('W' | 'D' | 'L')[];

  colores: { primary: string; secondary: string };
  escudo: string;
}

// ── Match ─────────────────────────────────────────────────────

export interface MatchGoal {
  playerId: string;
  playerName: string;
  minuto: number;
  equipo: 'local' | 'visitante';
  tipo: 'normal' | 'penal' | 'propia';
}

export interface MatchCard {
  playerId: string;
  playerName: string;
  minuto: number;
  tipo: 'amarilla' | 'roja' | 'segunda_amarilla';
  equipo: 'local' | 'visitante';
}

export interface MatchInjury {
  playerId: string;
  playerName: string;
  minuto: number;
  semanas: number;
  tipo: string;
  equipo: 'local' | 'visitante';
}

export interface PlayerRating {
  playerId: string;
  playerName: string;
  nota: number;
  destacado: boolean;
  tendencia: Trend;
}

export interface MatchEvent {
  minuto: number;
  tipo: 'gol' | 'tarjeta' | 'lesion' | 'cambio' | 'accion';
  equipo: 'local' | 'visitante';
  playerName: string;
  descripcion: string;
}

export interface MatchResult {
  id: string;
  jornada: number;
  localId: string;
  visitanteId: string;
  golesLocal: number;
  golesVisitante: number;
  goles: MatchGoal[];
  tarjetas: MatchCard[];
  lesiones: MatchInjury[];
  eventos: MatchEvent[];
  ratings: PlayerRating[];
  stats: {
    posesionLocal: number;
    posesionVisitante?: number;
    tirosLocal: number;
    tirosVisitante: number;
    corners: number[];
    faltas: number[];
  };
  mvp: string;
  esAmistoso?: boolean;
}

// ── Fixture ───────────────────────────────────────────────────

export interface Fixture {
  jornada: number;
  localId: string;
  visitanteId: string;
  resultado?: MatchResult;
  jugado: boolean;
  esAmistoso?: boolean;
}

// ── Transfer ──────────────────────────────────────────────────

export interface TransferOffer {
  id: string;
  tipo: TransferType;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  precio: number;
  salario?: number;
  clausulaNueva?: number;
  contrapartidaPlayerId?: string;
  jornadasCesion?: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'expirada';
  jornada: number;
}

// ── Preseason friendly ────────────────────────────────────────

export interface Friendly {
  id: string;
  rivalId: string;
  rivalNombre: string;
  resultado?: { gL: number; gV: number };
  jugado: boolean;
}

// ── Season summary ────────────────────────────────────────────

export interface SeasonSummary {
  temporada: number;
  clubNombre: string;       // F6-3: nombre del club esa temporada
  division: number;         // F6-3: 0=D1, 1=D2, 2=D3
  posicion: number;
  pts: number;
  pg: number; pe: number; pp: number;
  gf: number; gc: number;
  objetivoCumplido: boolean;
  ascendio?: boolean;       // F6-3: subió de división
  descendio?: boolean;      // F6-3: bajó de división
  titulo?: boolean;         // F6-3: ganó la liga
  mvpTemporada?: string;
  maxGoleador?: { nombre: string; goles: number };
  presupuestoFinal: number;
  presupuestoInicio: number; // F6-3: comparativa financiera
  fichajes: number;          // F6-3: nº de fichajes esa temporada
  ventas: number;            // F6-3: nº de ventas esa temporada
  repManager: number;
}

// ── Scout report ──────────────────────────────────────────────

export interface ScoutReport {
  id: string;
  playerId: string;
  playerNombre: string;
  playerClubId: string;
  mediaEstimada: number;
  potencialEstimado: number;
  recomendacion: 'fichar' | 'seguir' | 'descartar';
  costeEstimado: number;
  jornada: number;
}


// ── Transfer record (historial permanente) ────────────────────

export type TransferKind = 'alta' | 'baja' | 'cesion' | 'intercambio';

export interface TransferRecord {
  id: string;
  kind: TransferKind;
  temporada: number;
  jornada: number;
  playerNombre: string;
  clubNombre: string;    // origen o destino según kind
  importe: number;       // 0 para cesiones sin tarifa
  contrapartidaNombre?: string; // para intercambio
}

// ── Player recommendation ─────────────────────────────────────

export type RecommendationType = 'entrenar' | 'rotar' | 'mantener' | 'vigilar_conflicto' | 'considerar_venta';

export interface PlayerRecommendation {
  playerId: string;
  playerNombre: string;
  tipo: RecommendationType;
  motivo: string;        // texto breve legible
}

// ── Promesa de minutos (F6-4) ────────────────────────────────

export interface PromesaMinutos {
  playerId: string;
  playerNombre: string;
  jornadaPromesa: number;   // jornada en que se hizo la promesa
  jornadaLimite: number;    // jornada límite para cumplirla
  partidosJugados: number;  // partidos jugados desde la promesa
  minPartidos: number;      // mínimo requerido (3 de las próximas 5 jornadas)
  cumplida: boolean;
  caducada: boolean;
}

// ── Scout request (scouting activo) ──────────────────────────

export interface ScoutRequest {
  id: string;
  targetPlayerId: string;
  targetNombre: string;
  targetClubId: string;
  jornadasRestantes: number;  // tiempo de observación
  iniciada: number;           // jornada de inicio
}

// ── Game Event ────────────────────────────────────────────────

export interface GameEvent {
  id: string;
  tipo: EventType;
  titulo: string;
  descripcion: string;
  jornada: number;
  opciones: GameEventOption[];
  resuelto: boolean;
}

export interface GameEventOption {
  id: string;
  texto: string;
  efecto: string;
}

// ── Loot box ──────────────────────────────────────────────────

export interface LootBox {
  id: string;
  tier: LootBoxTier;
  costXP: number;
  contenido?: Player;
}

// ── Trivial ───────────────────────────────────────────────────

export interface TrivialQuestion {
  id: string;
  pregunta: string;
  opciones: string[];
  correcta: number;
  categoria: string;
  recompensaXP: number;
}

// ── Save slot ─────────────────────────────────────────────────

export interface SaveSlot {
  id: number;
  clubNombre: string;
  entrenadorNombre: string;
  temporada: number;
  jornada: number;
  posicion: number;
  division: Division;
  fecha: string;
  vacia: boolean;
}

// ── Game state ────────────────────────────────────────────────

export interface GameState {
  saveId: string;
  userId?: string;
  modo: 'manager' | 'carrera';
  temporada: number;
  jornada: number;
  fase: GamePhase;

  clubId: string;
  liga: Club[];

  calendario: Fixture[][];
  resultados: MatchResult[];
  jornadaInvierno: number;

  // Preseason
  amistosos: Friendly[];
  amistososJugados: number;

  // Market
  mercadoLibre: Player[];
  transferencias: TransferOffer[];

  // AI transfer activity log
  ultimasBajas: { clubNombre: string; playerNombre: string; precio: number }[];
  ultimasFichas: { clubNombre: string; playerNombre: string; precio: number }[];

  // Scout
  informesScouting: ScoutReport[];

  // Manager
  repManager: number;
  nombreManager: string;
  experienciaManager: number;
  tactica: { sistema: string; enfoque: TacticFocus };
  alineacion: string[];

  patrocinadorFirmado: boolean;

  eventosActivos: GameEvent[];
  eventosResueltos: string[];

  trivialJornada: number;
  trivialUsadas: string[];

  xpManager: number;
  lootBoxes: LootBox[];

  // Season history
  historialTemporadas: SeasonSummary[];

  // F5-2: historial de resultados de temporada (acceso rápido sin buscar en calendario)
  historialResultados: MatchResult[];

  // F5-3: historial de transferencias
  historialTransferencias: TransferRecord[];

  // F5-1: recomendaciones post-partido
  recomendacionesPostPartido: PlayerRecommendation[];

  // F5-5: scouting activo
  scoutRequests: ScoutRequest[];

  // F6-4: promesas de minutos activas
  promesasMinutos: PromesaMinutos[];

  // F6-3: presupuesto al inicio de temporada (para comparativa)
  presupuestoInicioTemporada: number;

  temporadaTerminada: boolean;
  liveMatchActive: boolean;
  ultimoEntrenamientoJornada?: number;

  // F4-4: déficit crónico
  jornadasEnDeficit: number;       // contador jornadas consecutivas en negativo
  bloqueadoPorDeuda: boolean;      // bloquea fichajes si déficit crónico
  advertenciaDirectiva: boolean;   // directiva ha advertido al manager
}

// ── WebSocket ─────────────────────────────────────────────────

export interface WsEvent {
  type: string;
  payload: unknown;
  roomId?: string;
  userId?: string;
  timestamp: number;
}

export type WsMatchEvent    = WsEvent & { type: 'match:event';    payload: MatchEvent };
export type WsLeagueUpdate  = WsEvent & { type: 'league:update';  payload: { clubId: string; pts: number; pj: number } };
export type WsTransferNews  = WsEvent & { type: 'transfer:news';  payload: { texto: string } };
