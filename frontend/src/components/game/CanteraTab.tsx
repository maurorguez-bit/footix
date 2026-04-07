import { useState, useEffect } from 'react';
import { useGameStore, useMyClub } from '@/stores/gameStore';
import { Bebas, Card, Tag, Progress, Empty, RatingBadge, PosBadge } from '@/components/ui';

const POS_COLORS: Record<string, string> = {
  POR: '#4a9eff', DEF: '#00e5a0', MED: '#ffd700', DEL: '#ff6b35',
};

export function CanteraTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { getCantera } = useGameStore();
  const club = useMyClub()!;
  const [cantera, setCantera] = useState<any[]>([]);
  const ojeador = club.staff.find(s => s.rol === 'ojeador');

  useEffect(() => {
    getCantera().then((c: any) => { if (Array.isArray(c)) setCantera(c); }).catch(() => {});
  }, []);

  return (
    <div className="p-4">
      {/* Ojeador info */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">🔭 Departamento de Cantera</Bebas>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold">{ojeador?.nombre ?? 'Sin ojeador'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
              Nivel {ojeador?.nivel ?? 0}/10 ·
              {(ojeador?.nivel ?? 0) >= 3 ? ' Descubre más talentos' : ' Mejora para encontrar mejores'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bebas text-2xl" style={{ color: 'var(--acc)' }}>{cantera.length}</p>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>Jugadores</p>
          </div>
        </div>
        <Progress value={(ojeador?.nivel ?? 0) * 10} color="var(--acc3)" className="mt-2" />
      </Card>

      {/* Legend */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Tag color="green">Descubierto</Tag>
        <Tag color="gray">Por descubrir</Tag>
        <Tag color="gold">Listo para subir</Tag>
      </div>

      {cantera.length === 0 && (
        <Empty icon="🌱" text="No hay jugadores en cantera. El ojeador buscará talentos cada jornada." />
      )}

      {cantera.map((p: any) => {
        const listoParaSubir = p.jornadasDesarrollo >= 10 && p.descubierto;
        return (
          <Card key={p.id}>
            <div className="flex items-center gap-3">
              {/* Position badge */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ background: `${POS_COLORS[p.pos] ?? '#888'}20`, color: POS_COLORS[p.pos] ?? '#888', border: `1px solid ${POS_COLORS[p.pos] ?? '#888'}40` }}>
                {p.pos}
              </div>

              <div className="flex-1">
                {p.descubierto ? (
                  <>
                    <p className="font-semibold text-sm">{p.nombre} {p.apellido}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
                      {p.edad} años · Potencial: <span style={{ color: 'var(--gol)', fontWeight: 700 }}>{p.potencial}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm" style={{ color: 'var(--tx3)' }}>Jugador desconocido</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx3)' }}>
                      {p.edad} años · Potencial oculto — mejora al ojeador
                    </p>
                  </>
                )}

                {/* Development progress */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--tx3)' }}>
                    <span>Desarrollo</span>
                    <span>{Math.min(10, p.jornadasDesarrollo)}/10 jornadas</span>
                  </div>
                  <Progress
                    value={Math.min(100, (p.jornadasDesarrollo / 10) * 100)}
                    color={listoParaSubir ? 'var(--acc)' : 'var(--acc3)'}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {listoParaSubir ? (
                  <Tag color="gold">🌟 Listo</Tag>
                ) : p.descubierto ? (
                  <Tag color="green">En desarrollo</Tag>
                ) : (
                  <Tag color="gray">Oculto</Tag>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Tips */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">💡 Cómo funciona</Bebas>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--tx3)' }}>
          Los jugadores de cantera se desarrollan automáticamente cada jornada. Tras 10 jornadas
          de desarrollo, los jugadores descubiertos suben al primer equipo. Un ojeador de nivel 3+
          descubre más talentos y puede ver su potencial real. La cantera se renueva cada temporada.
        </p>
      </Card>
    </div>
  );
}
