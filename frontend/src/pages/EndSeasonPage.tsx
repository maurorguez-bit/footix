import { useState, useEffect } from 'react';
import { useGameStore, useMyClub, useStandings } from '@/stores/gameStore';
import { Bebas, Btn, Card, StatRow, fmtK, Tag, Progress } from '@/components/ui';
import type { SeasonSummary } from '@shared/types/index';

export function EndSeasonPage({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, newSeason, getHistory } = useGameStore();
  const club      = useMyClub()!;
  const standings = useStandings();
  const [history, setHistory] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState(0);

  const myPos = standings.findIndex(c => c.id === state?.clubId) + 1;

  const obj = club.objetivo;
  const cumplido =
    (obj === 'Campeón'     && myPos === 1)  ||
    (obj === 'Top 8'       && myPos <= 8)   ||
    (obj === 'Media tabla' && myPos <= 12)  ||
    (obj === 'Salvación'   && myPos <= 16)  ||
    (obj === 'Ascenso'     && myPos <= 2);

  const topScorer = state?.liga
    .filter(c => c.div === club.div)
    .flatMap(c => c.plantilla)
    .sort((a, b) => b.goles - a.goles)[0];

  const mvp = [...club.plantilla].sort((a, b) => b.notaMedia - a.notaMedia)[0];

  useEffect(() => {
    getHistory().then((h: any) => { if (Array.isArray(h)) setHistory(h); }).catch(() => {});
  }, []);

  async function handleNewSeason() {
    setLoading(true);
    try { await newSeason(); onToast('🔄 ¡Nueva temporada!'); }
    catch (e: any) { onToast(e.message, 'err'); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <div className="text-center px-4 pt-14 pb-6" style={{ background: `linear-gradient(160deg,#0a1628,${cumplido?'#0d2a10':'#2a0a0a'})` }}>
        <p className="text-6xl mb-3">{cumplido ? '🏆' : '😔'}</p>
        <Bebas size={32} color={cumplido ? 'var(--acc)' : 'var(--dan)'}>
          {cumplido ? '¡OBJETIVO CUMPLIDO!' : 'OBJETIVO NO ALCANZADO'}
        </Bebas>
        <p className="text-sm mt-2" style={{ color: 'var(--tx2)' }}>
          Temporada {state?.temporada} · {myPos}º clasificado · Objetivo: {obj}
        </p>
      </div>

      <div className="px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--sur2)' }}>
          {['Resumen','Clasificación','Historial'].map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab === i ? 'var(--acc)' : 'transparent', color: tab === i ? '#000' : 'var(--tx2)' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {tab === 0 && (
          <>
            <Card>
              <Bebas size={14} color="var(--tx2)" className="mb-2">Temporada {state?.temporada}</Bebas>
              <StatRow label="Posición final"  value={`${myPos}º de ${standings.length}`} valueColor={myPos <= 4 ? 'var(--acc)' : myPos >= standings.length - 3 ? 'var(--dan)' : 'var(--tex)'} />
              <StatRow label="Puntos"          value={club.pts} valueColor="var(--acc)" />
              <StatRow label="Victorias"       value={club.pg} />
              <StatRow label="Empates"         value={club.pe} />
              <StatRow label="Derrotas"        value={club.pp} />
              <StatRow label="Goles a favor"   value={club.gf} />
              <StatRow label="Goles en contra" value={club.gc} />
              <StatRow label="Diferencia"      value={club.gf - club.gc > 0 ? `+${club.gf-club.gc}` : club.gf-club.gc} valueColor={club.gf > club.gc ? 'var(--acc)' : 'var(--dan)'} last />
            </Card>

            <Card>
              <Bebas size={14} color="var(--tx2)" className="mb-2">Economía</Bebas>
              <StatRow label="Presupuesto final"   value={fmtK(club.presupuesto)} />
              <StatRow label="Presupuesto inicial" value={fmtK(club.presupuestoInicial)} />
              <StatRow label="Balance"             value={(club.presupuesto >= club.presupuestoInicial ? '+' : '') + fmtK(club.presupuesto - club.presupuestoInicial)} valueColor={club.presupuesto >= club.presupuestoInicial ? 'var(--acc)' : 'var(--dan)'} last />
            </Card>

            {(mvp || topScorer) && (
              <Card>
                <Bebas size={14} color="var(--tx2)" className="mb-2">Premios</Bebas>
                {mvp && <StatRow label="🌟 MVP del club" value={`${mvp.nombre} ${mvp.apellido} (${mvp.notaMedia.toFixed(1)})`} />}
                {topScorer && topScorer.goles > 0 && <StatRow label="⚽ Máximo goleador" value={`${topScorer.nombre} ${topScorer.apellido} (${topScorer.goles}g)`} last />}
              </Card>
            )}

            <Card>
              <Bebas size={14} color="var(--tx2)" className="mb-2">Manager</Bebas>
              <StatRow label="Reputación"   value={`${state?.repManager}/100`} />
              <Progress value={state?.repManager ?? 0} className="mb-2" color={cumplido ? 'var(--acc)' : 'var(--dan)'} />
              <StatRow label="XP acumulado" value={state?.xpManager ?? 0} last />
            </Card>

            <Btn full loading={loading} onClick={handleNewSeason} className="mt-2">🔄 Iniciar Nueva Temporada</Btn>
          </>
        )}

        {/* ── CLASIFICACIÓN ── */}
        {tab === 1 && (
          <Card>
            {standings.map((c, i) => {
              const me = c.id === state?.clubId;
              return (
                <div key={c.id} className="flex items-center gap-2 py-2 px-1 rounded-lg"
                  style={{ borderBottom: `1px solid var(--bor)`, background: me ? 'var(--sur2)' : 'transparent' }}>
                  <span className="w-5 text-xs font-mono font-bold text-right" style={{ color: i < 4 ? 'var(--acc)' : i >= standings.length - 4 ? 'var(--dan)' : 'var(--tx2)' }}>{i+1}</span>
                  <span className="text-base">{c.escudo}</span>
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: me ? 'var(--acc)' : 'var(--tex)' }}>{c.nombre}{me ? ' 👤' : ''}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--tx3)' }}>{c.pj} {c.pg}-{c.pe}-{c.pp}</span>
                  <span className="text-sm font-mono font-bold w-7 text-right" style={{ color: 'var(--acc)' }}>{c.pts}</span>
                </div>
              );
            })}
          </Card>
        )}

        {/* ── HISTORIAL ── */}
        {tab === 2 && (
          history.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--tx3)' }}>
              <p className="text-4xl mb-2">📚</p>
              <p>Esta es tu primera temporada</p>
            </div>
          ) : (
            [...history].reverse().map((s, i) => (
              <Card key={i}>
                <div className="flex justify-between items-start mb-2">
                  <Bebas size={16}>Temporada {s.temporada}</Bebas>
                  <Tag color={s.objetivoCumplido ? 'green' : 'red'}>{s.objetivoCumplido ? '✅ Obj.' : '❌ Obj.'}</Tag>
                </div>
                <StatRow label="Posición" value={`${s.posicion}º`} />
                <StatRow label="V/E/D" value={`${s.pg}/${s.pe}/${s.pp}`} />
                <StatRow label="Goles" value={`${s.gf}/${s.gc}`} />
                <StatRow label="Puntos" value={s.pts} valueColor="var(--acc)" />
                {s.mvpTemporada && <StatRow label="MVP" value={s.mvpTemporada} />}
                <StatRow label="Presupuesto" value={fmtK(s.presupuestoFinal)} last />
              </Card>
            ))
          )
        )}
      </div>
    </div>
  );
}
