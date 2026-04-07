import { useState, useEffect } from 'react';
import { useGameStore, useMyClub } from '@/stores/gameStore';
import { Bebas, Card, StatRow, Tag, fmtK, Empty, RatingBadge, PosBadge, Btn, BottomSheet } from '@/components/ui';

// ─────────────────────────────────────────────────────────────
// F5-3: HISTORIAL DE TRANSFERENCIAS
// ─────────────────────────────────────────────────────────────

export function TransferHistoryTab() {
  const { state } = useGameStore();
  const records = [...(state?.historialTransferencias ?? [])].reverse();

  const kindLabel: Record<string, { label: string; color: string; icon: string }> = {
    alta:        { label: 'Alta',       color: 'var(--acc)',  icon: '📥' },
    baja:        { label: 'Baja',       color: 'var(--dan)',  icon: '📤' },
    cesion:      { label: 'Cesión',     color: 'var(--acc3)', icon: '🔄' },
    intercambio: { label: 'Intercambio',color: 'var(--gol)',  icon: '🔀' },
  };

  if (records.length === 0) return (
    <div className="p-4">
      <Empty icon="📋" text="Sin transferencias registradas esta temporada" />
    </div>
  );

  return (
    <div className="p-4">
      <Bebas size={18} className="mb-3">📋 Historial de Transferencias</Bebas>
      <Card className="!p-0 overflow-hidden">
        {records.map((r: any, i: number) => {
          const meta = kindLabel[r.kind] ?? kindLabel.alta;
          return (
            <div key={r.id} className="px-4 py-3 border-b" style={{ borderColor: 'var(--bor)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{r.playerNombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
                      <span className="font-bold" style={{ color: meta.color }}>{meta.label}</span>
                      {' · '}{r.clubNombre}
                      {r.contrapartidaNombre && ` (+${r.contrapartidaNombre})`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold" style={{ color: meta.color }}>
                    {r.importe > 0 ? fmtK(r.importe) : 'Gratis'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tx3)' }}>T{r.temporada} J{r.jornada}</p>
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// F5-4: INTERCAMBIO JUGADOR + DINERO (UI completa)
// ─────────────────────────────────────────────────────────────

export function IntercambioModal({ open, onClose, onToast }: {
  open: boolean;
  onClose: () => void;
  onToast: (m: string, t?: 'ok'|'err') => void;
}) {
  const { state, intercambiar } = useGameStore();
  const club = useMyClub()!;
  const [step, setStep]             = useState<'myPlayer' | 'rivalClub' | 'rivalPlayer' | 'confirm'>('myPlayer');
  const [myPlayer, setMyPlayer]     = useState<any>(null);
  const [rivalClub, setRivalClub]   = useState<any>(null);
  const [rivalPlayer, setRivalPlayer] = useState<any>(null);
  const [diferencia, setDiferencia] = useState(0);
  const [loading, setLoading]       = useState(false);

  function reset() { setStep('myPlayer'); setMyPlayer(null); setRivalClub(null); setRivalPlayer(null); setDiferencia(0); }

  const divClubs = state?.liga.filter(c => c.id !== state?.clubId) ?? [];
  const rivalPlayers = (rivalClub?.plantilla ?? []).filter((p: any) => !p.lesionado);

  const myVal  = myPlayer?.valor ?? 0;
  const rivVal = rivalPlayer?.valor ?? 0;
  const balance = rivVal - myVal + diferencia; // >0 yo recibo, <0 yo pago

  async function handleConfirm() {
    if (!myPlayer || !rivalPlayer || !rivalClub) return;
    setLoading(true);
    try {
      const r: any = await intercambiar(myPlayer.id, rivalPlayer.id, rivalClub.id, diferencia);
      if (r.aceptado) {
        onToast(`✅ Intercambio completado`);
        reset(); onClose();
      } else {
        onToast(r.mensaje ?? 'El club rechazó el intercambio', 'err');
      }
    } catch (e: any) { onToast(e.message, 'err'); }
    setLoading(false);
  }

  if (!open) return null;

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose(); }} title="🔀 Intercambio de Jugadores">
      {/* Step indicator */}
      <div className="flex gap-1 mb-4">
        {(['myPlayer','rivalClub','rivalPlayer','confirm'] as const).map((s, i) => (
          <div key={s} className="flex-1 h-1 rounded-full" style={{ background: step === s ? 'var(--acc)' : i < (['myPlayer','rivalClub','rivalPlayer','confirm'].indexOf(step)) ? 'var(--acc)60' : 'var(--bor)' }} />
        ))}
      </div>

      {/* Paso 1: elegir mi jugador */}
      {step === 'myPlayer' && (
        <>
          <p className="text-sm mb-3 font-semibold">1. Elige tu jugador a ofrecer</p>
          <div className="max-h-60 overflow-y-auto">
            {club.plantilla.filter(p => !p.lesionado && !p.enCesion).map(p => (
              <div key={p.id} onClick={() => { setMyPlayer(p); setStep('rivalClub'); }}
                className="flex items-center gap-3 p-3 rounded-xl mb-1 cursor-pointer active:bg-[var(--sur2)]"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
                <RatingBadge rating={p.media} />
                <div className="flex-1"><p className="font-semibold text-sm">{p.nombre} {p.apellido}</p><PosBadge pos={p.pos} /></div>
                <p className="font-mono text-sm" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paso 2: elegir club rival */}
      {step === 'rivalClub' && (
        <>
          <p className="text-sm mb-1 font-semibold">2. Elige el club destino</p>
          <p className="text-xs mb-3" style={{ color: 'var(--tx2)' }}>Ofreces: <b>{myPlayer?.nombre}</b> ({fmtK(myPlayer?.valor ?? 0)})</p>
          <div className="max-h-60 overflow-y-auto">
            {divClubs.map((c: any) => (
              <div key={c.id} onClick={() => { setRivalClub(c); setStep('rivalPlayer'); }}
                className="flex items-center gap-3 p-3 rounded-xl mb-1 cursor-pointer active:bg-[var(--sur2)]"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
                <span className="text-2xl">{c.escudo}</span>
                <div className="flex-1"><p className="font-semibold text-sm">{c.nombre}</p><p className="text-xs" style={{ color: 'var(--tx2)' }}>{['D1','D2','D3'][c.div]}</p></div>
              </div>
            ))}
          </div>
          <Btn variant="secondary" small className="mt-2" onClick={() => setStep('myPlayer')}>← Atrás</Btn>
        </>
      )}

      {/* Paso 3: elegir jugador del rival */}
      {step === 'rivalPlayer' && (
        <>
          <p className="text-sm mb-1 font-semibold">3. Elige jugador de {rivalClub?.nombre}</p>
          <p className="text-xs mb-3" style={{ color: 'var(--tx2)' }}>Ofreces: <b>{myPlayer?.nombre}</b> ({fmtK(myPlayer?.valor ?? 0)})</p>
          <div className="max-h-52 overflow-y-auto">
            {rivalPlayers.map((p: any) => (
              <div key={p.id} onClick={() => { setRivalPlayer(p); setStep('confirm'); }}
                className="flex items-center gap-3 p-3 rounded-xl mb-1 cursor-pointer active:bg-[var(--sur2)]"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
                <RatingBadge rating={p.media} />
                <div className="flex-1"><p className="font-semibold text-sm">{p.nombre} {p.apellido}</p><PosBadge pos={p.pos} /></div>
                <p className="font-mono text-sm" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
              </div>
            ))}
          </div>
          <Btn variant="secondary" small className="mt-2" onClick={() => setStep('rivalClub')}>← Atrás</Btn>
        </>
      )}

      {/* Paso 4: confirmar con diferencia */}
      {step === 'confirm' && myPlayer && rivalPlayer && (
        <>
          <p className="text-sm mb-3 font-semibold">4. Confirmar intercambio</p>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: 'var(--sur2)' }}>
            <div className="flex-1 text-center">
              <RatingBadge rating={myPlayer.media} size={44} />
              <p className="text-xs mt-1 font-semibold">{myPlayer.nombre}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--dan)' }}>{fmtK(myPlayer.valor)}</p>
            </div>
            <span className="text-2xl">🔀</span>
            <div className="flex-1 text-center">
              <RatingBadge rating={rivalPlayer.media} size={44} />
              <p className="text-xs mt-1 font-semibold">{rivalPlayer.nombre}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--acc)' }}>{fmtK(rivalPlayer.valor)}</p>
            </div>
          </div>

          {/* Ajuste de diferencia */}
          <p className="text-xs mb-1" style={{ color: 'var(--tx2)' }}>Diferencia en efectivo (negativo = tú pagas)</p>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setDiferencia(d => d - 500000)} className="w-10 h-10 rounded-lg font-bold flex-shrink-0" style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--dan)' }}>−</button>
            <p className="flex-1 text-center font-bebas text-2xl" style={{ color: diferencia >= 0 ? 'var(--acc)' : 'var(--dan)' }}>
              {diferencia >= 0 ? '+' : ''}{fmtK(diferencia)}
            </p>
            <button onClick={() => setDiferencia(d => d + 500000)} className="w-10 h-10 rounded-lg font-bold flex-shrink-0" style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--acc)' }}>+</button>
          </div>
          <div className="rounded-xl p-3 mb-3" style={{ background: balance >= 0 ? 'rgba(0,229,160,0.08)' : 'rgba(255,71,87,0.08)', border: `1px solid ${balance >= 0 ? 'var(--acc)' : 'var(--dan)'}30` }}>
            <p className="text-sm" style={{ color: balance >= 0 ? 'var(--acc)' : 'var(--dan)' }}>
              {balance >= 0 ? `✅ Recibes ${fmtK(Math.abs(balance))} de diferencia` : `❌ Pagas ${fmtK(Math.abs(balance))} de diferencia`}
            </p>
          </div>
          <div className="flex gap-2">
            <Btn full loading={loading} onClick={handleConfirm}>Proponer intercambio</Btn>
            <Btn full variant="secondary" onClick={() => setStep('rivalPlayer')}>← Atrás</Btn>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// F5-5: SCOUTING ACTIVO
// ─────────────────────────────────────────────────────────────

export function ScoutingActiveTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, getScoutingTargets, scoutPlayer, buyPlayer } = useGameStore();
  const club = useMyClub()!;
  const [data, setData]           = useState<any>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [posFilter, setPosFilter] = useState('');
  const [loading, setLoading]     = useState(false);
  const ojeador = club.staff.find(s => s.rol === 'ojeador');

  useEffect(() => {
    getScoutingTargets().then((d: any) => setData(d)).catch(() => {});
  }, [state?.jornada]);

  const allCPUPlayers = (state?.liga ?? [])
    .filter(c => c.id !== state?.clubId)
    .flatMap(c => (c.plantilla ?? []).map((p: any) => ({ ...p, clubNombre: c.nombre, clubId: c.id })))
    .filter((p: any) => !posFilter || p.pos === posFilter)
    .sort((a: any, b: any) => b.media - a.media);

  async function handleScout(targetPlayerId: string) {
    setLoading(true);
    try {
      const r: any = await scoutPlayer(targetPlayerId);
      onToast(`🔭 Scouting iniciado. Informe en ${r.jornadasObservacion} jornadas`);
      setSelectingTarget(false);
      setData(null);
      getScoutingTargets().then((d: any) => setData(d)).catch(() => {});
    } catch (e: any) { onToast(e.message, 'err'); }
    setLoading(false);
  }

  const recomColor = (r: string) => r === 'fichar' ? 'green' : r === 'seguir' ? 'gold' : 'red';
  const recomIcon  = (r: string) => r === 'fichar' ? '✅' : r === 'seguir' ? '👀' : '❌';

  return (
    <div className="p-4">
      {/* Ojeador status */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-sm">{ojeador?.nombre ?? 'Sin ojeador'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>Nivel {ojeador?.nivel ?? 0}/10 · {(ojeador?.nivel ?? 0) >= 2 ? '✅ Scouting activo disponible' : '⚠️ Necesitas ojeador nivel 2+ para scouting activo'}</p>
          </div>
          <p className="font-mono text-lg" style={{ color: 'var(--acc)' }}>{state?.xpManager ?? 0} XP</p>
        </div>
      </Card>

      {/* Scouts activos */}
      {(data?.activos ?? []).length > 0 && (
        <>
          <Bebas size={15} color="var(--tx2)" className="mb-2">🔭 Seguimientos activos</Bebas>
          {data.activos.map((r: any) => (
            <Card key={r.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{r.targetNombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
                    {state?.liga.find(c => c.id === r.targetClubId)?.nombre}
                  </p>
                </div>
                <Tag color="blue">{r.jornadasRestantes}j restantes</Tag>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Informes completados */}
      {(data?.informes ?? []).length > 0 && (
        <>
          <Bebas size={15} color="var(--tx2)" className="mb-2 mt-2">📄 Informes</Bebas>
          {[...(data.informes ?? [])].reverse().slice(0, 8).map((r: any, i: number) => (
            <Card key={i}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{r.playerNombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
                    {state?.liga.find(c => c.id === r.playerClubId)?.nombre} · J{r.jornada}
                  </p>
                </div>
                <Tag color={recomColor(r.recomendacion) as any}>{recomIcon(r.recomendacion)} {r.recomendacion}</Tag>
              </div>
              <StatRow label="Media estimada"    value={r.mediaEstimada} />
              <StatRow label="Potencial estimado" value={r.potencialEstimado} />
              <StatRow label="Coste estimado"    value={fmtK(r.costeEstimado)} last />
            </Card>
          ))}
        </>
      )}

      {/* Iniciar nuevo scouting */}
      <Btn full variant="secondary" className="mt-2"
        onClick={() => setSelectingTarget(true)}
        disabled={(ojeador?.nivel ?? 0) < 2}>
        {(ojeador?.nivel ?? 0) >= 2 ? '🔭 Iniciar seguimiento (50 XP)' : '🔒 Scouting activo bloqueado (nivel 2+)'}
      </Btn>

      {/* Selector de jugador objetivo */}
      <BottomSheet open={selectingTarget} onClose={() => setSelectingTarget(false)} title="Elegir jugador a seguir">
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="mb-3" style={{ fontSize: 12 }}>
          <option value="">Todas posiciones</option>
          {['POR','DEF','MED','DEL'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="max-h-72 overflow-y-auto">
          {allCPUPlayers.slice(0, 30).map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl mb-1 cursor-pointer active:bg-[var(--sur2)]"
              style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}
              onClick={() => handleScout(p.id)}>
              <RatingBadge rating={p.media} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.nombre} {p.apellido}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{p.clubNombre} · {p.pos} · {p.edad}a</p>
              </div>
              <p className="font-mono text-sm" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
