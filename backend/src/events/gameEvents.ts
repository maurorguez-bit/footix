/**
 * EVENTS SYSTEM
 * Random events that fire during the season with meaningful choices.
 */

import type { GameEvent, GameState, Club, Player } from '../../shared/types/index';

const uid = () => Math.random().toString(36).slice(2, 10);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── Event templates ───────────────────────────────────────────

type EventTemplate = {
  tipo: GameEvent['tipo']['tipo'] extends never ? string : string;
  probabilidad: number; // per jornada
  generar: (state: GameState, club: Club) => GameEvent | null;
};

function makeEvent(
  tipo: string,
  titulo: string,
  descripcion: string,
  opciones: GameEvent['opciones']
): GameEvent {
  return {
    id: uid(),
    tipo: tipo as any,
    titulo,
    descripcion,
    jornada: 0, // set by caller
    opciones,
    resuelto: false,
  };
}

const EVENT_TEMPLATES: EventTemplate[] = [
  // ── Player demands more playing time ──
  {
    tipo: 'conflicto',
    probabilidad: 0.06,  // F6-1: ~2-3 veces/temporada
    generar: (state, club) => {
      const bench = club.plantilla.filter(
        p => !state.alineacion.slice(0, 11).includes(p.id) && p.partidos < 5 && p.media >= 72
      );
      if (bench.length === 0) return null;
      const player = pick(bench);
      player.emocion = 'insatisfecho';
      return makeEvent('conflicto',
        `${player.nombre} ${player.apellido} pide más minutos`,
        `${player.nombre} está descontento con su rol en el equipo. Si no juega más, podría exigir la salida.`,
        [
          { id: 'a', texto: 'Prometerle más minutos', efecto: 'Mejora su moral. Deberás cumplirlo.' },
          { id: 'b', texto: 'Ignorar la queja', efecto: 'Su moral empeora. Puede pedir salida.' },
          { id: 'c', texto: 'Ponerle en venta', efecto: 'Acepta salir. Pierdes al jugador.' },
        ]
      );
    },
  },

  // ── Injury during training ──
  {
    tipo: 'lesion',
    probabilidad: 0.05,
    generar: (_, club) => {
      const available = club.plantilla.filter(p => !p.lesionado);
      if (available.length === 0) return null;
      const player = pick(available.filter(p => p.fisico < 60));
      if (!player) return null;
      const semanas = Math.floor(Math.random() * 4) + 1;
      player.lesionado = true;
      player.lesion_jornadas = semanas;
      player.lesionTipo = 'Sobrecarga en entrenamiento';
      return makeEvent('lesion',
        `Lesión en entrenamiento: ${player.nombre} ${player.apellido}`,
        `${player.nombre} ${player.apellido} se ha lesionado durante la sesión de entrenamiento. Baja ${semanas} semana${semanas !== 1 ? 's' : ''}.`,
        [
          { id: 'a', texto: 'Acelerar su recuperación (−100K€)', efecto: 'Vuelve 1 jornada antes.' },
          { id: 'b', texto: 'Recuperación normal', efecto: 'Sin coste adicional.' },
        ]
      );
    },
  },

  // ── International call-up ──
  {
    tipo: 'convocatoria',
    probabilidad: 0.04,  // F6-1: ~1-2 veces/temporada, solo parón real
    generar: (state, club) => {
      // F6-1: solo en jornadas de parón real (8-14 y 22-28)
      const j = state.jornada;
      const isParonWindow = (j >= 8 && j <= 14) || (j >= 22 && j <= 28);
      if (!isParonWindow) return null;
      const stars = club.plantilla.filter(p => p.media >= 76 && !p.convocado && !p.lesionado);
      if (stars.length === 0) return null;
      const player = pick(stars);
      return makeEvent('convocatoria',
        `${player.nombre} convocado con su selección`,
        `${player.nombre} ${player.apellido} ha sido llamado a la selección de ${player.pais} para el próximo parón. Se perderá 1 jornada.`,
        [
          { id: 'a', texto: 'Facilitar la convocatoria', efecto: 'Su moral sube. Buena relación con la federación.' },
          { id: 'b', texto: 'Solicitar que no vaya', efecto: 'Posible conflicto. La federación y el jugador se molestan.' },
        ]
      );
    },
  },

  // ── Sponsor offer ──
  {
    tipo: 'conflicto',
    probabilidad: 0.04,
    generar: (state, club) => {
      if (state.patrocinadorFirmado) return null;
      return makeEvent('conflicto',
        '¡Nueva oferta de patrocinio!',
        'Una empresa quiere patrocinar tu club con condiciones especiales por tiempo limitado.',
        [
          { id: 'a', texto: 'Aceptar la oferta (+20% ingresos)', efecto: 'Ingresos extra esta temporada.' },
          { id: 'b', texto: 'Rechazar y buscar mejor', efecto: 'Sin cambios por ahora.' },
        ]
      );
    },
  },

  // ── Stadium concert opportunity ──
  {
    tipo: 'concierto',
    probabilidad: 0.03,
    generar: (_, club) => {
      if (!club.stadium.tienda) return null;
      const ingresos = Math.round(club.stadium.capacidad * 15);
      return makeEvent('concierto',
        '¡Oferta para concierto en el estadio!',
        `Una promotora quiere alquilar tu estadio. Ingresarías ${(ingresos/1000).toFixed(0)}K€ pero el césped podría deteriorarse.`,
        [
          { id: 'a', texto: `Aceptar (+${(ingresos/1000).toFixed(0)}K€)`, efecto: 'Ingreso extra. Césped dañado: −2 en instalaciones 1 jornada.' },
          { id: 'b', texto: 'Rechazar', efecto: 'Sin riesgo ni ingresos.' },
        ]
      );
    },
  },

  // ── Player contract renewal ──
  {
    tipo: 'conflicto',
    probabilidad: 0.07,
    generar: (_, club) => {
      const expiring = club.plantilla.filter(p => p.contrato === 1 && p.media >= 70);
      if (expiring.length === 0) return null;
      const player = pick(expiring);
      const raise = Math.round(player.salario * 1.3);
      return makeEvent('conflicto',
        `${player.nombre} ${player.apellido} quiere renovar`,
        `El contrato de ${player.nombre} termina esta temporada. Quiere renovar con una subida salarial.`,
        [
          { id: 'a', texto: `Renovar (${(raise/1000).toFixed(0)}K€/sem)`, efecto: 'El jugador se queda con mejor contrato.' },
          { id: 'b', texto: 'Negociar a la baja', efecto: 'Posible conflicto. Puede no renovar.' },
          { id: 'c', texto: 'Dejar que se vaya libre', efecto: 'Lo pierdes al final de temporada.' },
        ]
      );
    },
  },

  // ── Youth talent discovered ──
  {
    tipo: 'conflicto',
    probabilidad: 0.04,
    generar: (state, _) => {
      const ojeador = state.liga.find(c => c.id === state.clubId)?.staff.find(s => s.rol === 'ojeador');
      if (!ojeador || ojeador.nivel < 4) return null;
      return makeEvent('conflicto',
        '¡Tu ojeador ha encontrado un talento!',
        'Tu ojeador ha localizado un joven promesa de 17 años. Puedes ficharlo por su precio de mercado.',
        [
          { id: 'a', texto: 'Fichar al joven (coste de mercado)', efecto: 'Se incorpora a la plantilla.' },
          { id: 'b', texto: 'Dejarlo pasar', efecto: 'Sin coste. Sin jugador.' },
        ]
      );
    },
  },
];

// ── Event resolver ────────────────────────────────────────────

export interface EventResolution {
  opcionId: string;
  club: Club;
  presupuestoDelta?: number;
  descripcionResultado: string;
}

export function resolveEvent(event: GameEvent, opcionId: string, club: Club): EventResolution {
  const opcion = event.opciones.find(o => o.id === opcionId);
  if (!opcion) return { opcionId, club, descripcionResultado: 'Opción no encontrada.' };

  let delta = 0;
  let desc = opcion.efecto;

  // Handle financial consequences
  if (event.tipo === 'concierto' && opcionId === 'a') {
    delta = Math.round(club.stadium.capacidad * 15);
    club.stadium.instalaciones = Math.max(1, club.stadium.instalaciones - 1);
    desc = `Ingresaste ${(delta/1000).toFixed(0)}K€. El césped sufrió daños temporales.`;
  }

  if (event.tipo === 'conflicto' && event.titulo.includes('renovar') && opcionId === 'a') {
    // Find player and update salary
    const playerName = event.titulo.split(' quiere')[0];
    const player = club.plantilla.find(p => `${p.nombre} ${p.apellido}` === playerName);
    if (player) {
      player.salario = Math.round(player.salario * 1.3);
      player.contrato = 3;
      player.moral = Math.min(100, player.moral + 15);
      player.emocion = 'feliz';
    }
  }

  if (event.tipo === 'conflicto' && event.titulo.includes('minutos') && opcionId === 'a') {
    const playerName = event.titulo.replace('pide más minutos', '').trim();
    const player = club.plantilla.find(p => `${p.nombre} ${p.apellido}` === playerName);
    if (player) {
      player.moral = Math.min(100, player.moral + 10);
      player.emocion = 'neutral';
    }
  }

  if (event.tipo === 'conflicto' && event.titulo.includes('minutos') && opcionId === 'b') {
    const playerName = event.titulo.replace('pide más minutos', '').trim();
    const player = club.plantilla.find(p => `${p.nombre} ${p.apellido}` === playerName);
    if (player) {
      player.moral = Math.max(0, player.moral - 20);
      player.emocion = 'enfadado';
    }
  }

  if (event.tipo === 'lesion' && opcionId === 'a') {
    delta = -100000;
    const player = club.plantilla.find(p => p.lesionado);
    if (player) player.lesion_jornadas = Math.max(0, player.lesion_jornadas - 1);
  }

  // F4-3: convocatoria aplica ausencia real de 1 jornada
  if (event.tipo === 'convocatoria') {
    const playerName = event.titulo.replace(' convocado con su selección', '').trim();
    const player = club.plantilla.find(p => `${p.nombre}` === playerName || event.titulo.startsWith(p.nombre));
    if (player) {
      if (opcionId === 'a') {
        // Facilitar: jugador ausente 1 jornada, moral sube
        player.convocado         = true;
        player.convocadoJornadas = 1;
        player.moral = Math.min(100, player.moral + 10);
        desc = `${player.nombre} viajará con su selección. Ausente 1 jornada.`;
      } else {
        // Bloquear: jugador enfadado, no viaja
        player.moral  = Math.max(0, player.moral - 15);
        player.emocion = 'insatisfecho';
        desc = `${player.nombre} no va a la selección. Está descontento.`;
      }
    }
  }

  // F5-6: resolver solicitud de salida
  if (event.tipo === 'solicitud_salida') {
    const playerName = event.titulo.replace(' exige salir', '').trim();
    const player = club.plantilla.find(p => `${p.nombre} ${p.apellido}` === playerName);
    if (player) {
      if (opcionId === 'vender') {
        player.enVenta    = true;
        player.precioVenta = Math.round(player.valor * 0.85); // precio reducido
        player.emocion    = 'insatisfecho'; // se calma un poco
        player.moral      = Math.min(100, player.moral + 15);
        desc = `${player.nombre} puesto en venta al 85% de su valor. Se ha calmado.`;
      } else if (opcionId === 'hablar') {
        player.moral   = Math.min(100, player.moral + 10);
        player.emocion = 'insatisfecho';
        // La promesa se registra — si no juega 3 de las próximas 5 jornadas, conflicto
        desc = `Has prometido más minutos a ${player.nombre}. Espera resultados.`;
      } else {
        player.emocion = 'conflicto';
        player.moral   = Math.max(0, player.moral - 10);
        desc = `${player.nombre} pasa a conflicto abierto. Su rendimiento caerá un 12%.`;
      }
    }
  }

  return { opcionId, club, presupuestoDelta: delta, descripcionResultado: desc };
}

// ── Event generator (called each jornada) ────────────────────

export function generateRandomEvents(
  state: GameState,
  club: Club
): GameEvent[] {
  const events: GameEvent[] = [];

  for (const template of EVENT_TEMPLATES) {
    if (Math.random() < template.probabilidad) {
      const event = template.generar(state, club);
      if (event) {
        event.jornada = state.jornada;
        events.push(event);
        break; // max 1 event per jornada
      }
    }
  }

  return events;
}
