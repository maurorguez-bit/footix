/**
 * TRIVIAL EDUCATIVO
 * Football knowledge questions with XP rewards.
 * Questions rotate to avoid repetition within a season.
 */

import type { TrivialQuestion } from '../../shared/types/index';

export const TRIVIAL_QUESTIONS: TrivialQuestion[] = [
  // ── Historia ──
  { id:'t001', pregunta:'¿En qué año se fundó la UEFA?', opciones:['1950','1954','1958','1960'], correcta:1, categoria:'Historia', recompensaXP:30 },
  { id:'t002', pregunta:'¿Quién marcó el gol de la final del Mundial 2010?', opciones:['Iniesta','Villa','Torres','Xavi'], correcta:0, categoria:'Historia', recompensaXP:25 },
  { id:'t003', pregunta:'¿Cuántas veces ha ganado Brasil el Mundial?', opciones:['4','5','6','3'], correcta:1, categoria:'Historia', recompensaXP:20 },
  { id:'t004', pregunta:'¿En qué país se celebró el primer Mundial de Fútbol?', opciones:['Brasil','Francia','Uruguay','Italia'], correcta:2, categoria:'Historia', recompensaXP:25 },
  { id:'t005', pregunta:'¿Qué club ha ganado más veces la Champions League?', opciones:['Barcelona','Bayern','Real Madrid','Juventus'], correcta:2, categoria:'Historia', recompensaXP:20 },
  { id:'t006', pregunta:'¿Cuánto dura un partido de fútbol reglamentario?', opciones:['90 min','80 min','100 min','75 min'], correcta:0, categoria:'Reglas', recompensaXP:10 },
  { id:'t007', pregunta:'¿Cuántos jugadores forman un equipo de fútbol?', opciones:['10','11','12','9'], correcta:1, categoria:'Reglas', recompensaXP:10 },
  { id:'t008', pregunta:'¿Qué significa "hat-trick"?', opciones:['3 goles','2 goles','4 goles','Penalti fallado'], correcta:0, categoria:'Vocabulario', recompensaXP:15 },
  { id:'t009', pregunta:'¿Cuántos puntos da una victoria en liga?', opciones:['2','3','1','4'], correcta:1, categoria:'Reglas', recompensaXP:10 },
  { id:'t010', pregunta:'¿A qué distancia se lanza un penalti?', opciones:['10m','11m','12m','9m'], correcta:1, categoria:'Reglas', recompensaXP:20 },

  // ── Táctica ──
  { id:'t011', pregunta:'¿Qué significa "pressing alto"?', opciones:['Defender cerca de tu portería','Presionar al rival en su campo','Jugar en largo','Defender en bloque bajo'], correcta:1, categoria:'Táctica', recompensaXP:25 },
  { id:'t012', pregunta:'¿Qué es el "fuera de juego"?', opciones:['Cuando el balón sale del campo','Estar más avanzado que el último defensa rival','Empujar a un rival','Tocar el balón con la mano'], correcta:1, categoria:'Reglas', recompensaXP:20 },
  { id:'t013', pregunta:'¿Qué posición juega un "pivote"?', opciones:['Delantero centro','Portero','Centrocampista defensivo','Lateral'], correcta:2, categoria:'Táctica', recompensaXP:25 },
  { id:'t014', pregunta:'¿Qué es un "falso 9"?', opciones:['Portero suplente','Delantero que baja a crear juego','Defensa que sube a atacar','Árbitro asistente'], correcta:1, categoria:'Táctica', recompensaXP:30 },
  { id:'t015', pregunta:'¿Cuántos cambios se permiten en un partido oficial?', opciones:['3','4','5','6'], correcta:2, categoria:'Reglas', recompensaXP:20 },

  // ── Gestión ──
  { id:'t016', pregunta:'¿Qué es una "cláusula de rescisión"?', opciones:['Penalti en copa','Precio fijo para comprar a un jugador','Contrato temporal','Sanción disciplinaria'], correcta:1, categoria:'Gestión', recompensaXP:25 },
  { id:'t017', pregunta:'¿Qué es el "fair play financiero"?', opciones:['Regla de juego limpio','Norma que limita el gasto de clubes','Sistema de puntos','Regulación de árbitros'], correcta:1, categoria:'Gestión', recompensaXP:30 },
  { id:'t018', pregunta:'¿Qué es una "cesión"?', opciones:['Traspasar un jugador permanentemente','Préstamo temporal de un jugador a otro club','Multa deportiva','Cambio de entrenador'], correcta:1, categoria:'Gestión', recompensaXP:25 },
  { id:'t019', pregunta:'¿Qué significa "agente libre"?', opciones:['Jugador sin equipo ni contrato','Árbitro neutral','Delantero rápido','Manager sin ficha'], correcta:0, categoria:'Gestión', recompensaXP:15 },
  { id:'t020', pregunta:'¿Qué es el "mercado de invierno"?', opciones:['Torneo invernal','Ventana de fichajes en enero','Liga de invierno','Partido benéfico'], correcta:1, categoria:'Gestión', recompensaXP:15 },

  // ── Estadios ──
  { id:'t021', pregunta:'¿Cuál es el estadio más grande del mundo?', opciones:['Camp Nou','Wembley','Rungrado','Maracaná'], correcta:2, categoria:'Estadios', recompensaXP:30 },
  { id:'t022', pregunta:'¿Qué club juega en Anfield?', opciones:['Manchester City','Arsenal','Liverpool','Everton'], correcta:2, categoria:'Estadios', recompensaXP:20 },
  { id:'t023', pregunta:'¿En qué ciudad está el estadio Azteca?', opciones:['Buenos Aires','Ciudad de México','Madrid','São Paulo'], correcta:1, categoria:'Estadios', recompensaXP:25 },

  // ── Física y fisiología ──
  { id:'t024', pregunta:'¿Qué músculo es clave para el disparo en fútbol?', opciones:['Bíceps','Cuádriceps','Trapecio','Gemelo'], correcta:1, categoria:'Fisiología', recompensaXP:30 },
  { id:'t025', pregunta:'¿Por qué es importante el calentamiento previo?', opciones:['Para cansar al rival','Para evitar lesiones','Para marcar más goles','Para ganar en los saltos'], correcta:1, categoria:'Fisiología', recompensaXP:20 },
  { id:'t026', pregunta:'¿Cuántos km recorre un jugador de élite en un partido?', opciones:['5-6 km','12-13 km','8-9 km','15-16 km'], correcta:1, categoria:'Fisiología', recompensaXP:25 },

  // ── Arbitraje ──
  { id:'t027', pregunta:'¿Qué indica la tarjeta amarilla?', opciones:['Expulsión directa','Amonestación','Penalti','Falta técnica'], correcta:1, categoria:'Reglas', recompensaXP:10 },
  { id:'t028', pregunta:'¿Cuándo se señala un córner?', opciones:['El balón sale por la línea de fondo tocado por defensa','El balón sale por la banda','Hay fuera de juego','Hay penalti'], correcta:0, categoria:'Reglas', recompensaXP:20 },
  { id:'t029', pregunta:'¿Qué es el VAR?', opciones:['Árbitro de reserva','Video Assistant Referee','Valoración de árbitros','Velocidad de ataque rápido'], correcta:1, categoria:'Reglas', recompensaXP:15 },
  { id:'t030', pregunta:'¿Cuántos árbitros hay en un partido oficial?', opciones:['1','2','3','4'], correcta:2, categoria:'Reglas', recompensaXP:15 },
];

export function getRandomTrivialSet(
  usadas: string[],
  cantidad: number = 5
): TrivialQuestion[] {
  const disponibles = TRIVIAL_QUESTIONS.filter(q => !usadas.includes(q.id));
  const shuffled = [...disponibles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(cantidad, shuffled.length));
}

export function calculateTrivialXP(preguntas: TrivialQuestion[], correctas: number[]): number {
  return correctas.reduce((total, idx) => {
    const q = preguntas[idx];
    return q ? total + q.recompensaXP : total;
  }, 0);
}
