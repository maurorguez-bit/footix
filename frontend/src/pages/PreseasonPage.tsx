import { useState, useEffect } from 'react';
import { useGameStore, useMyClub } from '@/stores/gameStore';
import { Bebas, Btn, Card, StatRow, RatingBadge, PosBadge, fmtK, BottomSheet, Tag, Tabs } from '@/components/ui';
import type { Friendly } from '@shared/types/index';

interface FriendlyData {
  amistosos: Friendly[];
  amistososJugados: number;
}

const SPONSORS = [
  { id:'local',    nombre:'Distribuciones García',  mult:0.7,  repMin:0,  desc:'Local y seguro',     icon:'🏪' },
  { id:'regional', nombre:'Grupo Inversiones Norte', mult:1.0,  repMin:30, desc:'Regional',           icon:'🏢' },
  { id:'nacional', nombre:'Telecom España',          mult:1.5,  repMin:55, desc:'Nacional',           icon:'📡' },
  { id:'inter',    nombre:'SportMax International',  mult:2.2,  repMin:75, desc:'Internacional',      icon:'🌍' },
  { id:'premier',  nombre:'GlobalBank Premium',      mult:3.5,  repMin:90, desc:'Élite',              icon:'💎' },
];

export function PreseasonPage({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, signSponsor, getFriendlies, playFriendly, iniciarLiga } = useGameStore();
  const club = useMyClub()!;
  const [tabIdx, setTabIdx]           = useState(0);
  const [friendlyData, setFriendlyData] = useState<FriendlyData | null>(null);
  const [playingId, setPlayingId]     = useState<string | null>(null);
  const [lastResult, setLastResult]   = useState<{ gL: number; gV: number; rival: string } | null>(null);

  useEffect(() => {
    getFriendlies().then((d: any) => setFriendlyData(d)).catch(() => {});
  }, [state?.jornada]);

  async function handlePlayFriendly(friendly: Friendly) {
    setPlayingId(friendly.id);
    try {
      const r: any = await playFriendly(friendly.id);
      setLastResult({ gL: r.resultado.gL, gV: r.resultado.gV, rival: friendly.rivalNombre });
      setFriendlyData(prev => prev ? { ...prev, amistososJugados: r.amistososJugados, amistosos: prev.amistosos.map(f => f.id === friendly.id ? { ...f, jugado: true, resultado: r.resultado } : f) } : prev);
      onToast(`Amistoso: ${r.resultado.gL}-${r.resultado.gV} vs ${friendly.rivalNombre}`);
    } catch (e: any) { onToast(e.message, 'err'); }
    setPlayingId(null);
  }

  async function handleSponsor(id: string) {
    try { await signSponsor(id); onToast('🤝 Patrocinador firmado'); }
    catch (e: any) { onToast(e.message, 'err'); }
  }

  const sponsorSigned =
    !!state?.patrocinadorFirmado ||
    !!(club.patrocinadorId && club.patrocinadorId !== '') ||
    (club.patrocinio ?? 0) > 0;
  const canStart = sponsorSigned;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 text-center" style={{ background: 'linear-gradient(160deg,#0a1628,#0d2a10)' }}>
        <Bebas size={28} color="var(--acc)">☀️ Pretemporada</Bebas>
        <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>{club.nombre} · Temporada {state?.temporada}</p>
        <div className="flex justify-center gap-3 mt-3">
          <div className="text-center">
            <p className="font-bebas text-xl" style={{ color: 'var(--acc)' }}>{friendlyData?.amistososJugados ?? 0}/4</p>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>Amistosos</p>
          </div>
          <div className="text-center">
            <p className="font-bebas text-xl" style={{ color: state?.patrocinadorFirmado ? 'var(--acc)' : 'var(--dan)' }}>
              {state?.patrocinadorFirmado ? '✅' : '❌'}
            </p>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>Patrocinador</p>
          </div>
          <div className="text-center">
            <p className="font-bebas text-xl" style={{ color: 'var(--acc)' }}>{fmtK(club.presupuesto)}</p>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>Presupuesto</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <Tabs tabs={['🤝 Patrocinio','⚽ Amistosos','🏋️ Plantilla']} active={tabIdx} onChange={setTabIdx} />

        {/* ── PATROCINIO ── */}
        {tabIdx === 0 && (
          state?.patrocinadorFirmado ? (
            <Card>
              <div className="text-center py-4">
                <p className="text-4xl mb-2">✅</p>
                <Bebas size={18} className="mb-1">Patrocinador Firmado</Bebas>
                <p className="font-bold text-base" style={{ color: 'var(--acc)' }}>
                  {SPONSORS.find(s => s.id === club.patrocinadorId)?.icon} {SPONSORS.find(s => s.id === club.patrocinadorId)?.nombre}
                </p>
                <p className="font-mono mt-2 text-lg" style={{ color: 'var(--acc)' }}>{fmtK(club.patrocinio)}/temporada</p>
                <p className="text-xs mt-1" style={{ color: 'var(--tx3)' }}>🔒 No puede cambiarse hasta la próxima pretemporada</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--acc2)' }}>⚠️ Debes firmar un patrocinador antes de iniciar la liga. El acuerdo dura toda la temporada.</p>
              </div>
              {SPONSORS.map(s => {
                const disponible = club.rep >= s.repMin;
                const importe    = Math.round(club.patrocinioBase * s.mult);
                return (
                  <Card key={s.id} className={disponible ? '' : 'opacity-50'}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-base">{s.icon} {s.nombre}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{s.desc}</p>
                        {!disponible && <p className="text-xs mt-1" style={{ color: 'var(--dan)' }}>Requiere reputación {s.repMin}+ (tienes {club.rep})</p>}
                      </div>
                      {disponible
                        ? <Btn small onClick={() => handleSponsor(s.id)}>Firmar</Btn>
                        : <Tag color="red">Sin rep.</Tag>}
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'var(--sur2)' }}>
                      <span className="text-xs" style={{ color: 'var(--tx2)' }}>Patrocinio anual</span>
                      <span className="font-mono font-bold text-base" style={{ color: 'var(--acc)' }}>{fmtK(importe)}</span>
                    </div>
                  </Card>
                );
              })}
            </>
          )
        )}

        {/* ── AMISTOSOS ── */}
        {tabIdx === 1 && (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--tx2)' }}>
              Juega hasta 4 amistosos para preparar la temporada. Mejoran la forma y el físico de tu plantilla.
            </p>

            {lastResult && (
              <Card>
                <p className="text-center font-bold text-lg">
                  {lastResult.gL > lastResult.gV ? '✅' : lastResult.gL === lastResult.gV ? '🤝' : '❌'} {lastResult.gL}-{lastResult.gV} vs {lastResult.rival}
                </p>
              </Card>
            )}

            {(friendlyData?.amistosos ?? []).map(f => {
              const rival = state?.liga.find(c => c.id === f.rivalId);
              const avg   = rival ? Math.round([...rival.plantilla].sort((a,b)=>b.media-a.media).slice(0,11).reduce((s,p)=>s+p.media,0)/11) : 0;
              return (
                <Card key={f.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rival?.escudo ?? '⚽'}</span>
                      <div>
                        <p className="font-semibold">{f.rivalNombre}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>Media: {avg} · {['D1','D2','D3'][rival?.div ?? 0]}</p>
                      </div>
                    </div>
                    {f.jugado ? (
                      <Tag color="gray">{f.resultado?.gL}-{f.resultado?.gV}</Tag>
                    ) : (
                      <Btn small loading={playingId === f.id} onClick={() => handlePlayFriendly(f)}>Jugar</Btn>
                    )}
                  </div>
                </Card>
              );
            })}

            {(friendlyData?.amistososJugados ?? 0) >= 4 && (
              <div className="text-center p-4" style={{ color: 'var(--tx2)' }}>
                Has jugado todos los amistosos disponibles 🏆
              </div>
            )}
          </>
        )}

        {/* ── PLANTILLA ── */}
        {tabIdx === 2 && (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--tx2)' }}>Revisa tu plantilla antes de iniciar la liga.</p>
            <Card className="!p-0 overflow-hidden">
              {[...club.plantilla].sort((a,b)=>b.media-a.media).map((p,i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < club.plantilla.length-1 ? '1px solid var(--bor)' : 'none' }}>
                  <RatingBadge rating={p.media} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.nombre} {p.apellido}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <PosBadge pos={p.pos} />
                      <span className="text-xs" style={{ color: 'var(--tx2)' }}>{p.edad}a · F{p.forma} · F{p.fisico}</span>
                    </div>
                  </div>
                  <p className="text-xs font-mono" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 z-50"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--bor)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        {!canStart && (
          <p className="text-xs text-center mb-2" style={{ color: 'var(--dan)' }}>
            {!state?.patrocinadorFirmado ? '⚠️ Firma un patrocinador para iniciar' : ''}
          </p>
        )}
        <Btn full disabled={!canStart} onClick={async () => {
          try { await iniciarLiga(); }
          catch(e: any) { onToast(e.message, 'err'); }
        }}>
          ⚽ Iniciar Liga
        </Btn>
      </div>
    </div>
  );
}
