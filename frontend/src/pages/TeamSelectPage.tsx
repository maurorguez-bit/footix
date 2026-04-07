import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { Bebas, Btn, Card, fmtK } from '@/components/ui';

interface ClubInfo { id: string; nombre: string; div: number; rep: number; escudo: string; capacidad: number; objetivo: string; presupuesto: number; }

const DIVS = ['División 1', 'División 2', 'División 3'];

export function TeamSelectPage() {
  const { slot } = useParams<{ slot: string }>();
  const slotN = parseInt(slot!);
  const navigate = useNavigate();
  const { newGame, user } = useGameStore();

  const [modo, setModo] = useState<'manager' | 'carrera' | null>(null);
  const [divFilter, setDivFilter] = useState(0);
  const [manager, setManager] = useState(user?.nombre ?? '');
  const [clubs, setClubs] = useState<ClubInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch club list once modo is chosen
  useEffect(() => {
    if (!modo) return;
    // We'll create a temp game to get clubs, but actually we just show CLUBS_BASE statically
    // The clubs are generated server-side, so we need a lightweight endpoint
    // For now fetch from a static list matching our data generator
    setClubs(STATIC_CLUBS);
    if (modo === 'carrera') setDivFilter(2);
  }, [modo]);

  async function selectClub(club: ClubInfo) {
    if (!manager.trim()) { setError('Introduce tu nombre de manager'); return; }
    setLoading(true); setError('');
    try {
      await newGame(slotN, modo!, club.nombre, manager.trim());
      navigate(`/game/${slotN}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (!modo) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto gap-4" style={{ background: 'var(--bg)' }}>
      <Bebas size={28} color="var(--acc)">Elige Modo de Juego</Bebas>
      <div className="w-full flex flex-col gap-3">
        <div onClick={() => setModo('manager')} className="p-5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform flex items-center gap-4"
          style={{ background: 'var(--sur)', border: '1px solid var(--bor)' }}>
          <span className="text-4xl">🏆</span>
          <div><p className="font-bold text-base">Modo Manager</p><p className="text-xs mt-1" style={{ color: 'var(--tx2)' }}>Elige cualquier club de las 3 divisiones</p></div>
        </div>
        <div onClick={() => setModo('carrera')} className="p-5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform flex items-center gap-4"
          style={{ background: 'var(--sur)', border: '1px solid var(--bor)' }}>
          <span className="text-4xl">🚀</span>
          <div><p className="font-bold text-base">Modo Carrera</p><p className="text-xs mt-1" style={{ color: 'var(--tx2)' }}>Empieza en un club modesto y llega a la cima</p></div>
        </div>
        <Btn variant="secondary" onClick={() => navigate('/saves')}>← Volver</Btn>
      </div>
    </div>
  );

  const filtered = clubs.filter(c => c.div === divFilter);

  return (
    <div className="min-h-screen flex flex-col max-w-[430px] mx-auto" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex justify-between items-center" style={{ background: 'var(--sur)', borderBottom: '1px solid var(--bor)' }}>
        <div><Bebas size={20} color="var(--acc)">Elige tu Club</Bebas>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{modo === 'carrera' ? 'Modo Carrera' : 'Modo Manager'}</p>
        </div>
        <Btn small variant="secondary" onClick={() => setModo(null)}>← Volver</Btn>
      </div>

      {/* Manager name */}
      <div className="px-4 pt-4">
        <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Tu nombre como manager</label>
        <input value={manager} onChange={e => setManager(e.target.value)} placeholder="Nombre del manager" className="mb-1" />
        {error && <p className="text-xs mt-1" style={{ color: 'var(--dan)' }}>{error}</p>}
      </div>

      {/* Division tabs */}
      <div className="flex gap-1 p-1 mx-4 mt-3 rounded-xl" style={{ background: 'var(--sur2)' }}>
        {DIVS.map((d, i) => (
          <button key={i} onClick={() => setDivFilter(i)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: divFilter === i ? 'var(--acc)' : 'transparent', color: divFilter === i ? '#000' : 'var(--tx2)' }}>
            {d}
          </button>
        ))}
      </div>

      {/* Club list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8">
        {filtered.map(c => (
          <div key={c.nombre} onClick={() => !loading && selectClub(c)}
            className="flex items-center justify-between p-4 rounded-xl mb-2 cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background: 'var(--sur)', border: '1px solid var(--bor)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.escudo}</span>
              <div>
                <p className="font-semibold text-sm">{c.nombre}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{c.objetivo} · Rep: {c.rep}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>{(c.capacidad / 1000).toFixed(0)}K asientos</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-bold" style={{ color: 'var(--acc)' }}>{fmtK(c.presupuesto)}</p>
              {loading && <p className="text-xs animate-pulse-slow" style={{ color: 'var(--tx3)' }}>...</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Static club list (mirrors dataGenerator.ts)
const STATIC_CLUBS: ClubInfo[] = [
  {id:'',nombre:'Atlético Capital',div:0,rep:90,escudo:'🔴',capacidad:55000,objetivo:'Campeón',presupuesto:80000000},
  {id:'',nombre:'Real Norteño',div:0,rep:95,escudo:'⚪',capacidad:60000,objetivo:'Campeón',presupuesto:100000000},
  {id:'',nombre:'Unión FC',div:0,rep:85,escudo:'🟠',capacidad:48000,objetivo:'Top 8',presupuesto:65000000},
  {id:'',nombre:'Deportivo Este',div:0,rep:82,escudo:'🟢',capacidad:42000,objetivo:'Top 8',presupuesto:55000000},
  {id:'',nombre:'Racing Valles',div:0,rep:78,escudo:'🔵',capacidad:38000,objetivo:'Media tabla',presupuesto:45000000},
  {id:'',nombre:'Sporting Sur',div:0,rep:75,escudo:'🟣',capacidad:35000,objetivo:'Media tabla',presupuesto:40000000},
  {id:'',nombre:'Valencia Sur',div:0,rep:88,escudo:'🟡',capacidad:50000,objetivo:'Top 8',presupuesto:70000000},
  {id:'',nombre:'Celta Ría',div:0,rep:73,escudo:'🩵',capacidad:32000,objetivo:'Media tabla',presupuesto:38000000},
  {id:'',nombre:'Betis Verde',div:0,rep:76,escudo:'💚',capacidad:36000,objetivo:'Media tabla',presupuesto:42000000},
  {id:'',nombre:'Sevilla Norte',div:0,rep:80,escudo:'❤️',capacidad:40000,objetivo:'Top 8',presupuesto:50000000},
  {id:'',nombre:'Español Centro',div:0,rep:83,escudo:'🔷',capacidad:44000,objetivo:'Top 8',presupuesto:58000000},
  {id:'',nombre:'Athletic Montaña',div:0,rep:79,escudo:'🦅',capacidad:37000,objetivo:'Media tabla',presupuesto:46000000},
  {id:'',nombre:'Villarreal Sur',div:0,rep:71,escudo:'🟨',capacidad:25000,objetivo:'Salvación',presupuesto:32000000},
  {id:'',nombre:'Granada Norte',div:0,rep:68,escudo:'❗',capacidad:22000,objetivo:'Salvación',presupuesto:28000000},
  {id:'',nombre:'Getafe Centro',div:0,rep:65,escudo:'🔹',capacidad:17000,objetivo:'Salvación',presupuesto:25000000},
  {id:'',nombre:'Osasuna Este',div:0,rep:67,escudo:'🔴',capacidad:19000,objetivo:'Salvación',presupuesto:26000000},
  {id:'',nombre:'Mallorca Isla',div:0,rep:70,escudo:'🏝️',capacidad:23000,objetivo:'Salvación',presupuesto:30000000},
  {id:'',nombre:'Almería Sol',div:0,rep:62,escudo:'☀️',capacidad:15000,objetivo:'Salvación',presupuesto:20000000},
  {id:'',nombre:'Cádiz Puerto',div:0,rep:63,escudo:'⚓',capacidad:20000,objetivo:'Salvación',presupuesto:22000000},
  {id:'',nombre:'Elche Sur',div:0,rep:72,escudo:'🌿',capacidad:33000,objetivo:'Salvación',presupuesto:35000000},
  {id:'',nombre:'Levante Azul',div:1,rep:60,escudo:'💙',capacidad:22000,objetivo:'Ascenso',presupuesto:18000000},
  {id:'',nombre:'Rayo Sur',div:1,rep:58,escudo:'⚡',capacidad:18000,objetivo:'Media tabla',presupuesto:14000000},
  {id:'',nombre:'Alavés Este',div:1,rep:62,escudo:'🦁',capacidad:20000,objetivo:'Ascenso',presupuesto:20000000},
  {id:'',nombre:'Granada Sur',div:1,rep:65,escudo:'🍎',capacidad:19000,objetivo:'Ascenso',presupuesto:22000000},
  {id:'',nombre:'Pontevedra FC',div:1,rep:55,escudo:'⚪',capacidad:17000,objetivo:'Media tabla',presupuesto:12000000},
  {id:'',nombre:'Getafe B',div:1,rep:52,escudo:'🔹',capacidad:16000,objetivo:'Salvación',presupuesto:10000000},
  {id:'',nombre:'Sabadell FC',div:1,rep:50,escudo:'🏭',capacidad:14000,objetivo:'Salvación',presupuesto:9000000},
  {id:'',nombre:'Córdoba Sur',div:1,rep:60,escudo:'🌿',capacidad:20000,objetivo:'Media tabla',presupuesto:16000000},
  {id:'',nombre:'Lugo FC',div:1,rep:48,escudo:'🏰',capacidad:15000,objetivo:'Salvación',presupuesto:8000000},
  {id:'',nombre:'Burgos Sur',div:1,rep:45,escudo:'🏯',capacidad:12000,objetivo:'Salvación',presupuesto:7000000},
  {id:'',nombre:'Tudelano',div:2,rep:30,escudo:'🔴',capacidad:6000,objetivo:'Ascenso',presupuesto:2000000},
  {id:'',nombre:'Sestao River',div:2,rep:28,escudo:'⚓',capacidad:5000,objetivo:'Media tabla',presupuesto:1500000},
  {id:'',nombre:'Hércules B',div:2,rep:32,escudo:'💪',capacidad:7000,objetivo:'Ascenso',presupuesto:2500000},
  {id:'',nombre:'Mérida AD',div:2,rep:35,escudo:'🏛️',capacidad:8000,objetivo:'Ascenso',presupuesto:3000000},
  {id:'',nombre:'Salmantino',div:2,rep:26,escudo:'🦎',capacidad:5500,objetivo:'Salvación',presupuesto:1200000},
  {id:'',nombre:'Calvo Sotelo',div:2,rep:22,escudo:'🔵',capacidad:4000,objetivo:'Salvación',presupuesto:900000},
  {id:'',nombre:'Badajoz Sur',div:2,rep:38,escudo:'🏠',capacidad:9000,objetivo:'Ascenso',presupuesto:4000000},
  {id:'',nombre:'Linares Dep',div:2,rep:30,escudo:'⭐',capacidad:6000,objetivo:'Media tabla',presupuesto:2000000},
  {id:'',nombre:'Villanovense',div:2,rep:25,escudo:'🧡',capacidad:5000,objetivo:'Salvación',presupuesto:1100000},
  {id:'',nombre:'Alcorcón B',div:2,rep:22,escudo:'🔒',capacidad:4500,objetivo:'Salvación',presupuesto:900000},
];
