import { useState, useEffect } from 'react';
import { useGameStore, useMyClub, useMyPosition } from '@/stores/gameStore';
import { Bebas, Card, StatRow, Progress, Tag, fmtK, Empty } from '@/components/ui';
import type { SeasonSummary } from '@shared/types/index';

export function ManagerTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, getHistory } = useGameStore();
  const club = useMyClub()!;
  const pos  = useMyPosition();
  const [history, setHistory] = useState<SeasonSummary[]>([]);

  useEffect(() => {
    getHistory().then((h: any) => { if (Array.isArray(h)) setHistory(h); }).catch(() => {});
  }, []);

  const trofeos   = history.filter(s => s.objetivoCumplido).length;
  const titulos   = history.filter(s => s.titulo).length;
  const ascensos  = history.filter(s => (s as any).ascendio).length;
  const descensos = history.filter(s => (s as any).descendio).length;
  const rachaV    = (() => {
    let streak = 0;
    for (const s of [...history].reverse()) {
      if (s.objetivoCumplido) streak++; else break;
    }
    return streak;
  })();
  const balanceTotal = history.reduce((acc, s) =>
    acc + (s.presupuestoFinal - (s.presupuestoInicio ?? s.presupuestoFinal)), 0);
  const divNames = ['D1','D2','D3'];

  const repColor = state!.repManager >= 70 ? 'var(--acc)' : state!.repManager >= 40 ? 'var(--gol)' : 'var(--dan)';
  const repLabel = state!.repManager >= 80 ? 'Leyenda' : state!.repManager >= 60 ? 'Consolidado' : state!.repManager >= 40 ? 'Prometedor' : 'Novel';

  return (
    <div className="p-4">
      {/* Manager card */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
            👔
          </div>
          <div className="flex-1">
            <Bebas size={22}>{state!.nombreManager}</Bebas>
            <p className="text-sm mt-0.5" style={{ color: 'var(--tx2)' }}>{repLabel} · Temporada {state!.temporada}</p>
            <Tag color={state!.repManager >= 60 ? 'green' : state!.repManager >= 40 ? 'gold' : 'red'}>
              Rep {state!.repManager}/100
            </Tag>
          </div>
        </div>
        <Progress value={state!.repManager} color={repColor} className="mb-3" />

        <div className="grid grid-cols-3 gap-2">
          {[
            { v: state!.temporada, l: 'Temporadas' },
            { v: trofeos, l: '✅ Objetivos' },
            { v: rachaV, l: '🔥 Racha' },
          ].map((x, i) => (
            <div key={i} className="text-center rounded-xl p-2" style={{ background: 'var(--sur2)' }}>
              <p className="font-bebas text-2xl" style={{ color: 'var(--acc)' }}>{x.v}</p>
              <p className="text-xs" style={{ color: 'var(--tx2)' }}>{x.l}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* XP & current season */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">Temporada Actual</Bebas>
        <StatRow label="Club"        value={club.nombre} />
        <StatRow label="Posición"    value={`${pos}º de ${state!.liga.filter(c => c.div === club.div).length}`} />
        <StatRow label="Objetivo"    value={club.objetivo} />
        <StatRow label="XP total"    value={state!.xpManager} valueColor="var(--acc)" />
        <StatRow label="Experiencia" value={state!.experienciaManager} last />
      </Card>

      {/* Carrera — resumen global */}
      {history.length > 0 && (
        <Card>
          <Bebas size={14} color="var(--tx2)" className="mb-2">Resumen de Carrera</Bebas>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { v: history.length, l: 'Temporadas', c: 'var(--tex)' },
              { v: trofeos,        l: '✅ Objetivos', c: 'var(--acc)' },
              { v: titulos,        l: '🏆 Títulos',   c: 'var(--gol)' },
              { v: rachaV,         l: '🔥 Racha',     c: 'var(--acc3)' },
              { v: ascensos,       l: '⬆️ Ascensos',  c: 'var(--acc)' },
              { v: descensos,      l: '⬇️ Descensos', c: 'var(--dan)' },
            ].map((x, i) => (
              <div key={i} className="rounded-xl p-2 text-center" style={{ background: 'var(--sur2)' }}>
                <p className="font-bebas text-2xl" style={{ color: x.c }}>{x.v}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>{x.l}</p>
              </div>
            ))}
          </div>
          <StatRow label="Balance económico total" last
            value={`${balanceTotal >= 0 ? '+' : ''}${fmtK(Math.abs(balanceTotal))}`}
            valueColor={balanceTotal >= 0 ? 'var(--acc)' : 'var(--dan)'} />
        </Card>
      )}

      {/* Historial por temporada */}
      <Bebas size={16} color="var(--tx2)" className="mb-2 mt-1">Historial de Temporadas</Bebas>
      {history.length === 0 && <Empty icon="📚" text="El historial aparecerá al terminar tu primera temporada completa" />}
      {[...history].reverse().map((s, i) => {
        const divBadge = divNames[(s as any).division ?? 0] ?? 'D1';
        return (
        <Card key={i}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <Bebas size={15}>Temporada {s.temporada}</Bebas>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--sur2)', color: 'var(--acc3)' }}>{divBadge}</span>
                {(s as any).clubNombre && <span className="text-xs" style={{ color: 'var(--tx2)' }}>{(s as any).clubNombre}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Tag color={s.objetivoCumplido ? 'green' : 'red'}>{s.objetivoCumplido ? '✅' : '❌'} Objetivo</Tag>
              {s.titulo && <Tag color="gold">🏆 Campeón</Tag>}
              {(s as any).ascendio && <Tag color="green">⬆️ Ascenso</Tag>}
              {(s as any).descendio && <Tag color="red">⬇️ Descenso</Tag>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <StatRow label="Posición" value={`${s.posicion}º`} />
            <StatRow label="Puntos"   value={s.pts} valueColor="var(--acc)" />
            <StatRow label="V/E/D"    value={`${s.pg}/${s.pe}/${s.pp}`} />
            <StatRow label="GF/GC"    value={`${s.gf}/${s.gc}`} />
            {(s as any).fichajes !== undefined && <StatRow label="Fichajes" value={(s as any).fichajes} />}
            {(s as any).ventas   !== undefined && <StatRow label="Ventas"   value={(s as any).ventas} />}
          </div>
          {(s.presupuestoInicio != null) && (
            <StatRow label="Balance €" last
              value={`${s.presupuestoFinal - s.presupuestoInicio >= 0 ? '+' : ''}${fmtK(Math.abs(s.presupuestoFinal - s.presupuestoInicio))}`}
              valueColor={s.presupuestoFinal >= s.presupuestoInicio ? 'var(--acc)' : 'var(--dan)'} />
          )}
          {s.mvpTemporada && (
            <p className="text-xs mt-1.5 pt-1.5 border-t" style={{ color: 'var(--tx2)', borderColor: 'var(--bor)' }}>
              🌟 MVP: {s.mvpTemporada}
            </p>
          )}
          {s.maxGoleador && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
              ⚽ Goleador: {s.maxGoleador.nombre} ({s.maxGoleador.goles} goles)
            </p>
          )}
        </Card>
        );
      })}
    </div>
  );
}
