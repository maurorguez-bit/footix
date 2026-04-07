/**
 * DATA GENERATOR v2
 * - Name pools by nationality for cultural coherence
 * - No duplicate names (tracked via Set)
 * - Balanced squad generation
 */

import type { Player, Club, Position, Nationality, Division, StaffMember, Stadium } from '../../shared/types/index';

// ── Name pools by nationality ─────────────────────────────────

const NAME_POOLS: Record<string, { names: string[]; surnames: string[] }> = {
  ES: {
    names: ['Carlos','Miguel','Alejandro','David','Pablo','Javier','Sergio','Raúl','Marcos','Adrián','Óscar','Alberto','Diego','Iván','Rubén','Álvaro','Fernando','Roberto','Andrés','Luis','Eduardo','Rodrigo','Gabriel','Samuel','Víctor','Mario','Nicolás','Hugo','Martín','Jonás'],
    surnames: ['García','Martínez','López','Sánchez','Pérez','González','Romero','Torres','Ramírez','Flores','Herrera','Méndez','Castro','Ortiz','Moreno','Silva','Vargas','Rojas','Ruiz','Navarro','Díaz','Reyes','Alonso','Vega','Molina','Blanco','Cabrera','Delgado','Santos','Ramos'],
  },
  FR: {
    names: ['Antoine','Lucas','Mathieu','Kylian','Ousmane','Paul','Raphaël','Corentin','Théo','Benjamin','Hugo','Florian','Alexandre','Pierre','Thomas','Kevin','Wissam','Nabil','Riyad','Adrien'],
    surnames: ['Dupont','Martin','Bernard','Leroy','Moreau','Dubois','Petit','Simon','Laurent','Michel','Lefebvre','Girard','Blanc','Rousseau','Henry','Maignan','Mbappé','Dembélé','Benzema','Pogba'],
  },
  DE: {
    names: ['Thomas','Manuel','Julian','Kai','Leroy','Toni','Joshua','Leon','Marco','Jonas','Niklas','Serge','Robin','Christopher','Florian','Marcel','Lars','Stefan','Sven','Lukas'],
    surnames: ['Müller','Neuer','Kroos','Goretzka','Havertz','Werner','Gnabry','Brandt','Kimmich','Süle','Rüdiger','Gündogan','Sancho','Baumgartner','Schmidt','Fischer','Weber','Koch','Becker','Wolf'],
  },
  BR: {
    names: ['Gabriel','Lucas','Rafael','Rodrygo','Vinicius','Thiago','Fabinho','Fred','Richarlison','Neymar','Roberto','Marcelo','Casemiro','Bruno','Everton','Antony','Endrick','Sávio','Matheus','João'],
    surnames: ['Silva','Costa','Santos','Oliveira','Pereira','Fernandes','Alves','Souza','Lima','Ferreira','Barbosa','Rodrigues','Carvalho','Nascimento','Dias','Andrade','Araújo','Moura','Júnior','Filho'],
  },
  AR: {
    names: ['Lionel','Lautaro','Paulo','Rodrigo','Julián','Ángel','Alejandro','Marcos','Nicolás','Leandro','Germán','Emiliano','Joaquín','Cristian','Exequiel','Thiago','Giovanni','Valentín','Matías','Diego'],
    surnames: ['Messi','Martínez','Dybala','De Paul','Álvarez','Di María','Mac Allister','Acuña','Tagliafico','Paredes','Pezzella','Fernández','Otamendi','Romero','Musso','Molina','Cuti','Lisandro','Julián','Enzo'],
  },
  PT: {
    names: ['Cristiano','Bruno','Bernardo','João','Rúben','Diogo','Rafael','Pedro','Vitinha','Otávio','Renato','Gonçalo','Nuno','Ricardo','Hélder','André','Fábio','Mário','Rui','Hugo'],
    surnames: ['Ronaldo','Fernandes','Silva','Cancelo','Dias','Jota','Leão','Neto','Sanches','Santos','Guedes','Ramos','Mendes','Semedo','Costa','Dalot','Palhinha','Trincão','Vitinha','Neves'],
  },
  NG: {
    names: ['Victor','Kelechi','Wilfred','Samuel','Emmanuel','Odion','Alex','Ahmed','Jamilu','Chukwuemeka','Cyriel','Terem','Chidera','Moses','Paul','Sunday','Leon','Valentine','Kenneth','Simy'],
    surnames: ['Osimhen','Iheanacho','Ndidi','Chukwueze','Iguodala','Ighalo','Iwobi','Musa','Collins','Onuachu','Dessers','Moffi','Obi','Simon','Ogu','Okonkwo','Bailey','Bassey','Omeruo','Ekong'],
  },
  Default: {
    names: ['Adam','Erik','Stefan','Nikola','Boris','Ivan','Milos','Zoran','Drazen','Dragan','Alen','Davor','Goran','Krunoslav','Igor','Tomislav','Ante','Josip','Dario','Vedran'],
    surnames: ['Kovačić','Modrić','Perišić','Rebić','Vlašić','Brozović','Gvardiol','Sosa','Livaja','Petković','Budimir','Ivanušec','Oršić','Moro','Sučić','Uremović','Erlić','Šimić','Juranović','Stanišić'],
  },
};

const NATIONALITY_POOLS: Nationality[] = ['ES', 'ES', 'ES', 'EU', 'EU', 'EX'];
const COUNTRY_BY_NATIONALITY: Record<Nationality, string[]> = {
  ES: ['ES'],
  EU: ['FR', 'DE', 'PT'],
  EX: ['BR', 'AR', 'NG'],
};

// ── Name deduplication ────────────────────────────────────────

// usedNames es LOCAL a cada llamada de generateLeague — no global de proceso
// F1-5: se evita contaminación entre partidas

function generateName(pais: string, used: Set<string>): { nombre: string; apellido: string } {
  const pool = NAME_POOLS[pais] ?? NAME_POOLS['Default'];
  let attempts = 0;
  while (attempts < 50) {
    const nombre   = pool.names[Math.floor(Math.random() * pool.names.length)];
    const apellido = pool.surnames[Math.floor(Math.random() * pool.surnames.length)];
    const full = `${nombre} ${apellido}`;
    if (!used.has(full)) {
      used.add(full);
      return { nombre, apellido };
    }
    attempts++;
  }
  const nombre   = pool.names[Math.floor(Math.random() * pool.names.length)];
  const apellido = pool.surnames[Math.floor(Math.random() * pool.surnames.length)] + Math.floor(Math.random() * 99);
  used.add(`${nombre} ${apellido}`);
  return { nombre, apellido };
}

// Kept for backwards compatibility — no-op now
export function resetNamePool() {}

// ── Player generation ─────────────────────────────────────────

let _uid = 1;
const genId = () => `p${_uid++}`;

function rnd(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function generatePlayer(div: Division, pos?: Position, used?: Set<string>): Player {
  const _used = used ?? new Set<string>();
  const base  = div === 0 ? rnd(72, 92) : div === 1 ? rnd(62, 82) : rnd(50, 72);
  const edad  = pos === 'POR' ? rnd(20, 36) : rnd(17, 35);
  const pot   = Math.min(99, base + rnd(0, Math.max(0, 28 - (edad - 17) * 2)));

  const nationality: Nationality = NATIONALITY_POOLS[Math.floor(Math.random() * NATIONALITY_POOLS.length)];
  const countryOptions = COUNTRY_BY_NATIONALITY[nationality];
  const pais = countryOptions[Math.floor(Math.random() * countryOptions.length)];

  const { nombre, apellido } = generateName(pais, _used);
  const valor = Math.round(base * base * 1800 * (0.8 + Math.random() * 0.4));
  // F7-2: salarios calibrados por división para balance económico realista
  // D1: factor 0.055 (~x2.5 vs original), D2: 0.035, D3: 0.022
  const salFactor = div === 0 ? 0.055 : div === 1 ? 0.035 : 0.022;
  const salario = Math.round(valor * salFactor / 100) * 100;

  return {
    id: genId(),
    nombre,
    apellido,
    edad,
    pos: pos ?? randomPos(),
    nacionalidad: nationality,
    pais,
    media: base,
    potencial: pot,
    forma: rnd(60, 95),
    fisico: rnd(65, 95),
    moral: rnd(65, 90),
    experiencia: rnd(0, 200),
    valor,
    salario,
    clausula: Math.round(valor * rnd(2, 6)),
    contrato: rnd(1, 5),
    goles: 0,
    asistencias: 0,
    partidos: 0,
    minutosJugados: 0,
    tarjetas_amarillas: 0,
    tarjetas_rojas: 0,
    notaMedia: 0,
    lesionado: false,
    lesion_jornadas: 0,
    lesionTipo: '',
    emocion: 'neutral',
    enVenta: false,
    precioVenta: 0,
    enCesion: false,
    convocado: false,         // F4-3
    convocadoJornadas: 0,     // F4-3
    jornadasSinJugar: 0,
    mediaTemporadas: [],
    mejorasSemana: 0,
  };
}

function randomPos(): Position {
  const r = Math.random();
  if (r < 0.09) return 'POR';
  if (r < 0.45) return 'DEF';
  if (r < 0.75) return 'MED';
  return 'DEL';
}

// ── Squad generation (balanced) ───────────────────────────────

export function generateSquad(div: Division, used: Set<string>): Player[] {
  const squad: Player[] = [];

  squad.push(generatePlayer(div, 'POR', used));
  squad.push(generatePlayer(div, 'POR', used));

  for (let i = 0; i < 6; i++) squad.push(generatePlayer(div, 'DEF', used));
  for (let i = 0; i < 6; i++) squad.push(generatePlayer(div, 'MED', used));
  for (let i = 0; i < 5; i++) squad.push(generatePlayer(div, 'DEL', used));

  for (let i = squad.length; i < 20; i++) squad.push(generatePlayer(div, undefined, used));

  return squad;
}

// ── Staff generation ──────────────────────────────────────────

let _suid = 1;
const sgenId = () => `s${_suid++}`;

export function generateStaff(div: Division): StaffMember[] {
  const baseLevel = div === 0 ? rnd(4, 8) : div === 1 ? rnd(2, 6) : rnd(1, 4);

  const roles: StaffMember['rol'][] = ['entrenador', 'ojeador', 'fisio', 'ayudante', 'preparador'];
  return roles.map(rol => {
    const pool = NAME_POOLS['ES'];
    const nombre = `${pool.names[rnd(0, pool.names.length - 1)]} ${pool.surnames[rnd(0, pool.surnames.length - 1)]}`;
    const nivel = Math.max(1, Math.min(10, baseLevel + rnd(-1, 1)));
    return {
      id: sgenId(),
      nombre,
      rol,
      nivel,
      experiencia: rnd(0, 500),
      salario: nivel * 8000 * (div === 0 ? 3.5 : div === 1 ? 2 : 1),  // F7-2: staff más caro
      contrato: rnd(1, 3),
    };
  });
}

// ── Stadium ───────────────────────────────────────────────────

export function generateStadium(nombre: string, div: Division, capacidad: number): Stadium {
  return {
    nombre,
    capacidad,
    instalaciones: div === 0 ? rnd(5, 9) : div === 1 ? rnd(3, 7) : rnd(1, 5),
    tienda: div === 0,
    parking: div === 0,
    bar: true,
    vestuarios: div === 0 ? rnd(3, 5) : div === 1 ? rnd(2, 4) : rnd(1, 3),
    entradas_precio: div === 0 ? rnd(35, 80) : div === 1 ? rnd(15, 35) : rnd(8, 20),
    bar_precio: div === 0 ? rnd(4, 8) : rnd(2, 5),
    tienda_revenue_mult: 1,
  };
}

// ── Free market players ───────────────────────────────────────

export function generateFreeMarket(): Player[] {
  const used = new Set<string>();
  return Array.from({ length: 35 }, (_, i) => {
    const div: Division = i < 10 ? 0 : i < 22 ? 1 : 2;
    return generatePlayer(div, undefined, used);
  });
}

// ── Loot box player ───────────────────────────────────────────

export function generateLootPlayer(tier: string): Player {
  const div: Division = tier === 'diamante' ? 0 : tier === 'oro' ? 0 : tier === 'plata' ? 1 : 2;
  const p = generatePlayer(div, undefined, new Set<string>());

  // Boost for higher tiers
  if (tier === 'diamante') {
    p.media = Math.max(p.media, rnd(80, 92));
    p.potencial = Math.max(p.potencial, p.media + rnd(3, 8));
  } else if (tier === 'oro') {
    p.media = Math.max(p.media, rnd(74, 85));
  } else if (tier === 'plata') {
    p.media = Math.max(p.media, rnd(66, 77));
  }

  return p;
}

// ── Club base data ────────────────────────────────────────────

export const CLUBS_BASE = [
  // División 0 (Primera)
  { nombre:'Atlético Capital',  div:0 as Division, estadio:'Estadio Capital',    capacidad:55000, rep:90, colores:{primary:'#cc0000',secondary:'#ffffff'}, escudo:'🔴' },
  { nombre:'Real Norteño',      div:0 as Division, estadio:'La Ciudadela',        capacidad:60000, rep:95, colores:{primary:'#003399',secondary:'#ffffff'}, escudo:'⚪' },
  { nombre:'Unión FC',          div:0 as Division, estadio:'Estadio de la Unión', capacidad:48000, rep:85, colores:{primary:'#ff6600',secondary:'#000000'}, escudo:'🟠' },
  { nombre:'Deportivo Este',    div:0 as Division, estadio:'El Coliseo',          capacidad:42000, rep:82, colores:{primary:'#006600',secondary:'#ffffff'}, escudo:'🟢' },
  { nombre:'Racing Valles',     div:0 as Division, estadio:'Los Valles',          capacidad:38000, rep:78, colores:{primary:'#003366',secondary:'#cccccc'}, escudo:'🔵' },
  { nombre:'Sporting Sur',      div:0 as Division, estadio:'El Vergel',           capacidad:35000, rep:75, colores:{primary:'#cc0066',secondary:'#ffffff'}, escudo:'🟣' },
  { nombre:'Valencia Sur',      div:0 as Division, estadio:'El Jardín',           capacidad:50000, rep:88, colores:{primary:'#ffcc00',secondary:'#000000'}, escudo:'🟡' },
  { nombre:'Celta Ría',         div:0 as Division, estadio:'Estadio Ría',         capacidad:32000, rep:73, colores:{primary:'#6699cc',secondary:'#ffffff'}, escudo:'🩵' },
  { nombre:'Betis Verde',       div:0 as Division, estadio:'El Parque',           capacidad:36000, rep:76, colores:{primary:'#009900',secondary:'#ffffff'}, escudo:'💚' },
  { nombre:'Sevilla Norte',     div:0 as Division, estadio:'Ramón Norte',         capacidad:40000, rep:80, colores:{primary:'#cc0000',secondary:'#ffffff'}, escudo:'❤️' },
  { nombre:'Español Centro',    div:0 as Division, estadio:'Gran Estadio',        capacidad:44000, rep:83, colores:{primary:'#003399',secondary:'#ffcc00'}, escudo:'🔷' },
  { nombre:'Athletic Montaña',  div:0 as Division, estadio:'San Bernabé',         capacidad:37000, rep:79, colores:{primary:'#cc3300',secondary:'#000000'}, escudo:'🦅' },
  { nombre:'Villarreal Sur',    div:0 as Division, estadio:'El Madrigal Sur',     capacidad:25000, rep:71, colores:{primary:'#ffff00',secondary:'#000033'}, escudo:'🟨' },
  { nombre:'Granada Norte',     div:0 as Division, estadio:'Estadio Norte',       capacidad:22000, rep:68, colores:{primary:'#cc0000',secondary:'#0000cc'}, escudo:'❗' },
  { nombre:'Getafe Centro',     div:0 as Division, estadio:'Coliseum Centro',     capacidad:17000, rep:65, colores:{primary:'003366',secondary:'#ffffff'},  escudo:'🔹' },
  { nombre:'Osasuna Este',      div:0 as Division, estadio:'El Sadar Este',       capacidad:19000, rep:67, colores:{primary:'#cc0000',secondary:'#000000'}, escudo:'🔴' },
  { nombre:'Mallorca Isla',     div:0 as Division, estadio:'Son Moix Isla',       capacidad:23000, rep:70, colores:{primary:'#cc0000',secondary:'#000000'}, escudo:'🏝️' },
  { nombre:'Almería Sol',       div:0 as Division, estadio:'Estadio Sol',         capacidad:15000, rep:62, colores:{primary:'#cc3300',secondary:'#ffffff'}, escudo:'☀️' },
  { nombre:'Cádiz Puerto',      div:0 as Division, estadio:'Nuevo Puerto',        capacidad:20000, rep:63, colores:{primary:'#ffff00',secondary:'#0000cc'}, escudo:'⚓' },
  { nombre:'Elche Sur',         div:0 as Division, estadio:'Martínez Sur',        capacidad:33000, rep:72, colores:{primary:'#009900',secondary:'#ffffff'}, escudo:'🌿' },

  // División 1 (Segunda)
  { nombre:'Levante Azul',      div:1 as Division, estadio:'Estadio Azul',        capacidad:22000, rep:60, colores:{primary:'#0000cc',secondary:'#cc0000'}, escudo:'💙' },
  { nombre:'Rayo Sur',          div:1 as Division, estadio:'La Franja',           capacidad:18000, rep:58, colores:{primary:'#cc0000',secondary:'#ffffff'}, escudo:'⚡' },
  { nombre:'Alavés Este',       div:1 as Division, estadio:'Mendizábal',          capacidad:20000, rep:62, colores:{primary:'#003399',secondary:'#ffffff'}, escudo:'🦁' },
  { nombre:'Granada Sur',       div:1 as Division, estadio:'Los Cármenes',        capacidad:19000, rep:65, colores:{primary:'#cc0000',secondary:'#0000cc'}, escudo:'🍎' },
  { nombre:'Pontevedra FC',     div:1 as Division, estadio:'Pasarón',             capacidad:17000, rep:55, colores:{primary:'#ffffff',secondary:'#000000'}, escudo:'⚪' },
  { nombre:'Getafe B',          div:1 as Division, estadio:'Estadio Municipal',   capacidad:16000, rep:52, colores:{primary:'#003366',secondary:'#ffffff'}, escudo:'🔹' },
  { nombre:'Sabadell FC',       div:1 as Division, estadio:'Nova Creu',           capacidad:14000, rep:50, colores:{primary:'#cc3300',secondary:'#000066'}, escudo:'🏭' },
  { nombre:'Córdoba Sur',       div:1 as Division, estadio:'El Arcángel',         capacidad:20000, rep:60, colores:{primary:'#ffffff',secondary:'#009900'}, escudo:'🌿' },
  { nombre:'Lugo FC',           div:1 as Division, estadio:'Anxo Carro',          capacidad:15000, rep:48, colores:{primary:'#ffffff',secondary:'#cc0000'}, escudo:'🏰' },
  { nombre:'Burgos Sur',        div:1 as Division, estadio:'El Plantío',          capacidad:12000, rep:45, colores:{primary:'#003399',secondary:'#cc0000'}, escudo:'🏯' },

  // División 2 (Tercera)
  { nombre:'Tudelano',          div:2 as Division, estadio:'El Peral',            capacidad:6000,  rep:30, colores:{primary:'#cc0000',secondary:'#ffffff'}, escudo:'🔴' },
  { nombre:'Sestao River',      div:2 as Division, estadio:'El Sardinero B',      capacidad:5000,  rep:28, colores:{primary:'#cc0000',secondary:'#000000'}, escudo:'⚓' },
  { nombre:'Hércules B',        div:2 as Division, estadio:'Rico Pérez Mini',     capacidad:7000,  rep:32, colores:{primary:'#0000cc',secondary:'#ffffff'}, escudo:'💪' },
  { nombre:'Mérida AD',         div:2 as Division, estadio:'El Romano',           capacidad:8000,  rep:35, colores:{primary:'#0000cc',secondary:'#ffcc00'}, escudo:'🏛️' },
  { nombre:'Salmantino',        div:2 as Division, estadio:'Helmántico B',        capacidad:5500,  rep:26, colores:{primary:'#cc3300',secondary:'#000000'}, escudo:'🦎' },
  { nombre:'Calvo Sotelo',      div:2 as Division, estadio:'El Pozo',             capacidad:4000,  rep:22, colores:{primary:'#003399',secondary:'#ffffff'}, escudo:'🔵' },
  { nombre:'Badajoz Sur',       div:2 as Division, estadio:'Nuevo Vivero',        capacidad:9000,  rep:38, colores:{primary:'#cc0000',secondary:'#000066'}, escudo:'🏠' },
  { nombre:'Linares Dep',       div:2 as Division, estadio:'Linarejos',           capacidad:6000,  rep:30, colores:{primary:'#ffff00',secondary:'#cc0000'}, escudo:'⭐' },
  { nombre:'Villanovense',      div:2 as Division, estadio:'El Romeral',          capacidad:5000,  rep:25, colores:{primary:'#ff6600',secondary:'#000000'}, escudo:'🧡' },
  { nombre:'Alcorcón B',        div:2 as Division, estadio:'Santo Domingo B',     capacidad:4500,  rep:22, colores:{primary:'#003366',secondary:'#cc0000'}, escudo:'🔒' },
];

// ── Full club generator ───────────────────────────────────────

let _cuid = 1;
const cgenId = () => `c${_cuid++}`;

export function generateLeague(): Club[] {
  // F1-5: Set local — aislado por partida, no contamina otras partidas
  const used = new Set<string>();
  _cuid = 1; _suid = 1; _uid = 1;

  return CLUBS_BASE.map((base, i) => {
    const presupuesto = base.div === 0
      ? rnd(40, 120) * 1e6
      : base.div === 1 ? rnd(8, 35) * 1e6
      : rnd(2, 12) * 1e6;  // F8-2: D3 más viable al inicio

    const divOffset = i - base.div * 20; // 20 clubs per div for div0, 10 for div1/2
    const objetivo  = base.div === 0
      ? (divOffset < 4 ? 'Campeón' : divOffset < 8 ? 'Top 8' : divOffset < 14 ? 'Media tabla' : 'Salvación')
      : (divOffset < 2 ? 'Ascenso' : divOffset < 5 ? 'Media tabla' : 'Salvación');

    const patBase = base.div === 0
      ? rnd(3, 10) * 1e6
      : base.div === 1 ? rnd(500, 3000) * 1e3
      : rnd(150, 600) * 1e3;  // F8-2: D3 patrocinio mínimo viable

    return {
      id: cgenId(),
      nombre: base.nombre,
      div: base.div,
      rep: base.rep,
      objetivo,
      presupuesto,
      presupuestoInicial: presupuesto,
      patrocinioBase: patBase,
      patrocinio: patBase,
      patrocinadorId: 'regional',
      patrocinadorFirmado: false,
      plantilla: generateSquad(base.div, used),
      staff: generateStaff(base.div),
      stadium: generateStadium(base.estadio, base.div, base.capacidad),
      obras: [],
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, forma: [],
      colores: base.colores,
      escudo: base.escudo,
    };
  });
}
