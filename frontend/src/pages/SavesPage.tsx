import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { Bebas, Btn, Card } from '@/components/ui';

const DIVS = ['División 1', 'División 2', 'División 3'];

export function SavesPage() {
  const { saves, loadGame, deleteGame, logout, user } = useGameStore();
  const navigate = useNavigate();

  async function handleLoad(slot: number) {
    await loadGame(slot);
    navigate(`/game/${slot}`);
  }

  async function handleDelete(slot: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('¿Borrar esta partida?')) await deleteGame(slot);
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[430px] mx-auto" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex justify-between items-end" style={{ background: 'linear-gradient(180deg,#0d2040,var(--bg))' }}>
        <div>
          <div className="flex items-center gap-3"><img src="/logo.png" alt="Footix" style={{height:36}} /><Bebas size={24}>Mis Partidas</Bebas></div>
          <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Hola, {user?.nombre} 👋</p>
        </div>
        <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--sur2)', color: 'var(--tx2)' }}>Salir</button>
      </div>

      <div className="flex-1 px-4 pb-8">
        {[1, 2, 3, 4].map(slot => {
          const save = saves.find(s => s.slot === slot);
          const empty = !save || save.vacia;

          return (
            <Card key={slot} onClick={() => !empty && handleLoad(slot)}
              className={empty ? '' : 'cursor-pointer active:scale-[0.98] transition-transform'}>
              <div className="flex items-center gap-4">
                {/* Slot number */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bebas text-2xl flex-shrink-0"
                  style={{ background: empty ? 'var(--sur2)' : 'var(--acc)20', color: empty ? 'var(--tx3)' : 'var(--acc)', border: `1px solid ${empty ? 'var(--bor)' : 'var(--acc)40'}` }}>
                  {slot}
                </div>

                {empty ? (
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--tx3)' }}>Ranura vacía</p>
                    <Btn small variant="secondary" className="mt-2" onClick={() => navigate(`/select/${slot}`)}>+ Nueva partida</Btn>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-bold text-base">{save!.clubNombre}</p>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--tx2)' }}>
                        {DIVS[save!.division ?? 0]} · T{save!.temporada} · J{save!.jornada} · {save!.posicion}º
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--tx3)' }}>
                        {new Date(save!.updatedAt!).toLocaleDateString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Btn small onClick={() => handleLoad(slot)}>Jugar</Btn>
                      <button onClick={e => handleDelete(slot, e)} className="text-xs py-1 px-2 rounded-lg" style={{ color: 'var(--dan)', background: 'rgba(255,71,87,0.1)' }}>Borrar</button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
