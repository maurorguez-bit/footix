import { useState } from 'react';
import { useGameStore, useMyClub } from '@/stores/gameStore';
import { Bebas, Btn, Card, StatRow, Tag, fmtK, BottomSheet, RatingBadge, PosBadge } from '@/components/ui';

const TIERS = [
  { id: 'bronce',   icon: '🥉', label: 'Bronce',   costXP: 150,  color: '#cd7f32', desc: 'Jugadores de División 3. Media 50-72.',        garantia: 'Media 50-72' },
  { id: 'plata',    icon: '🥈', label: 'Plata',    costXP: 400,  color: '#aaaaaa', desc: 'Jugadores de División 2. Media 66-77.',        garantia: 'Media 66-77' },
  { id: 'oro',      icon: '🥇', label: 'Oro',      costXP: 900,  color: '#ffd700', desc: 'Jugadores de División 1. Media 74-85.',        garantia: 'Media 74-85' },
  { id: 'diamante', icon: '💎', label: 'Diamante', costXP: 2000, color: '#00e5ff', desc: 'Jugadores élite. Media 80-92. Potencial alto.', garantia: 'Media 80-92' },
];

export function LootTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, buyLootBox, openLootBox } = useGameStore();
  const club = useMyClub()!;
  const [buying, setBuying]         = useState('');
  const [opening, setOpening]       = useState('');
  const [revealedPlayer, setRevealed] = useState<any>(null);
  const [confirmTier, setConfirmTier] = useState<typeof TIERS[0] | null>(null);

  const xp        = state?.xpManager ?? 0;
  const boxes     = state?.lootBoxes ?? [];
  const unopened  = boxes.filter(b => !b.contenido);
  const opened    = boxes.filter(b => !!b.contenido);

  async function handleBuy(tier: typeof TIERS[0]) {
    setBuying(tier.id);
    try {
      await buyLootBox(tier.id);
      onToast(`📦 Loot box ${tier.label} comprada`);
      setConfirmTier(null);
    } catch (e: any) { onToast(e.message, 'err'); }
    setBuying('');
  }

  async function handleOpen(boxId: string) {
    setOpening(boxId);
    try {
      const r: any = await openLootBox(boxId);
      setRevealed(r.player);
      onToast(`🌟 ¡${r.player.nombre} ${r.player.apellido} (${r.player.media}) descubierto!`);
    } catch (e: any) { onToast(e.message, 'err'); }
    setOpening('');
  }

  return (
    <div className="p-4">
      {/* XP balance */}
      <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', border: '1px solid var(--bor)' }}>
        <div>
          <Bebas size={13} color="var(--tx2)">Tu saldo</Bebas>
          <p className="font-bebas text-4xl" style={{ color: 'var(--gol)' }}>{xp.toLocaleString()} XP</p>
          <p className="text-xs mt-1" style={{ color: 'var(--tx3)' }}>
            Gana XP jugando partidos, completando trivial y ganando eventos
          </p>
        </div>
        <span className="text-5xl">⚡</span>
      </div>

      {/* How to earn XP */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">Cómo ganar XP</Bebas>
        <StatRow label="🏆 Victoria"        value="+30 XP" />
        <StatRow label="🤝 Empate"           value="+15 XP" />
        <StatRow label="❌ Derrota"          value="+8 XP" />
        <StatRow label="🧠 Trivial (cada pregunta)" value="+10-30 XP" />
        <StatRow label="📋 Evento resuelto"  value="+10-20 XP" last />
      </Card>

      {/* Shop */}
      <Bebas size={18} className="mb-3 mt-1">🛒 Tienda de Loot</Bebas>
      {TIERS.map(tier => {
        const canAfford = xp >= tier.costXP;
        return (
          <div key={tier.id} className="rounded-2xl p-4 mb-3"
            style={{ background: 'var(--sur)', border: `1px solid ${tier.color}40` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{tier.icon}</span>
                <div>
                  <p className="font-bold text-base" style={{ color: tier.color }}>{tier.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{tier.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bebas text-xl" style={{ color: canAfford ? 'var(--gol)' : 'var(--tx3)' }}>
                  {tier.costXP.toLocaleString()} XP
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs px-2 py-0.5 rounded" style={{ background: `${tier.color}20`, color: tier.color }}>
                Garantía: {tier.garantia}
              </p>
              <Btn small
                loading={buying === tier.id}
                variant={canAfford ? 'primary' : 'secondary'}
                style={canAfford ? { background: tier.color, color: '#000' } as any : {}}
                onClick={() => canAfford ? setConfirmTier(tier) : onToast(`Faltan ${tier.costXP - xp} XP para la caja ${tier.label}`, 'err')}>
                {canAfford ? 'Comprar' : `Faltan ${tier.costXP - xp} XP`}
              </Btn>
            </div>
          </div>
        );
      })}

      {/* Unopened boxes */}
      {unopened.length > 0 && (
        <>
          <Bebas size={18} className="mb-3 mt-2">📦 Sin abrir ({unopened.length})</Bebas>
          {unopened.map(box => {
            const tier = TIERS.find(t => t.id === box.tier)!;
            return (
              <div key={box.id} className="rounded-xl p-4 mb-2 flex items-center justify-between"
                style={{ background: 'var(--sur)', border: `1px solid ${tier?.color ?? 'var(--bor)'}50` }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{tier?.icon ?? '📦'}</span>
                  <div>
                    <p className="font-bold" style={{ color: tier?.color }}>{tier?.label} Box</p>
                    <p className="text-xs" style={{ color: 'var(--tx3)' }}>Toca para revelar el jugador</p>
                  </div>
                </div>
                <Btn small loading={opening === box.id}
                  style={{ background: tier?.color, color: '#000' } as any}
                  onClick={() => handleOpen(box.id)}>
                  🎁 Abrir
                </Btn>
              </div>
            );
          })}
        </>
      )}

      {/* Opened boxes history */}
      {opened.length > 0 && (
        <>
          <Bebas size={15} color="var(--tx2)" className="mb-2 mt-3">Historial de aperturas</Bebas>
          <Card className="!p-0 overflow-hidden">
            {opened.slice(-10).reverse().map((box, i) => {
              const p = box.contenido!;
              const tier = TIERS.find(t => t.id === box.tier);
              return (
                <div key={box.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < Math.min(9, opened.length - 1) ? '1px solid var(--bor)' : 'none' }}>
                  <span className="text-xl">{tier?.icon}</span>
                  <RatingBadge rating={p.media} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.nombre} {p.apellido}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <PosBadge pos={p.pos} />
                      <span className="text-xs" style={{ color: 'var(--tx2)' }}>{p.edad}a · Pot {p.potencial}</span>
                    </div>
                  </div>
                  <p className="text-xs font-mono" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
                </div>
              );
            })}
          </Card>
          <p className="text-xs text-center mt-2" style={{ color: 'var(--tx3)' }}>
            Los jugadores obtenidos están en el mercado libre — ficha desde Mercado → Disponibles
          </p>
        </>
      )}

      {/* Confirm buy modal */}
      <BottomSheet open={!!confirmTier} onClose={() => setConfirmTier(null)} title="Confirmar compra">
        {confirmTier && (
          <>
            <div className="text-center mb-4">
              <span className="text-6xl">{confirmTier.icon}</span>
              <p className="font-bebas text-2xl mt-2" style={{ color: confirmTier.color }}>{confirmTier.label} Box</p>
              <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>{confirmTier.desc}</p>
            </div>
            <Card>
              <StatRow label="Coste" value={`${confirmTier.costXP.toLocaleString()} XP`} valueColor="var(--gol)" />
              <StatRow label="Tu saldo" value={`${xp.toLocaleString()} XP`} />
              <StatRow label="Saldo restante" value={`${(xp - confirmTier.costXP).toLocaleString()} XP`}
                valueColor={xp - confirmTier.costXP >= 0 ? 'var(--acc)' : 'var(--dan)'} last />
            </Card>
            <div className="flex gap-2 mt-2">
              <Btn full loading={buying === confirmTier.id}
                style={{ background: confirmTier.color, color: '#000' } as any}
                onClick={() => handleBuy(confirmTier)}>
                Comprar {confirmTier.label} Box
              </Btn>
              <Btn full variant="secondary" onClick={() => setConfirmTier(null)}>Cancelar</Btn>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Reveal modal */}
      <BottomSheet open={!!revealedPlayer} onClose={() => setRevealed(null)} title="¡Jugador revelado!">
        {revealedPlayer && (
          <>
            <div className="text-center mb-4">
              <span className="text-5xl">🌟</span>
              <Bebas size={24} className="mt-2">{revealedPlayer.nombre} {revealedPlayer.apellido}</Bebas>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <RatingBadge rating={revealedPlayer.media} size={64} />
              <div>
                <p className="font-semibold">{revealedPlayer.pos} · {revealedPlayer.edad} años</p>
                <p className="text-sm" style={{ color: 'var(--tx2)' }}>Potencial: {revealedPlayer.potencial}</p>
                <p className="text-sm font-mono" style={{ color: 'var(--acc)' }}>{fmtK(revealedPlayer.valor)}</p>
              </div>
            </div>
            <Card>
              <StatRow label="Forma"   value={`${revealedPlayer.forma}/100`} />
              <StatRow label="Físico"  value={`${revealedPlayer.fisico}/100`} />
              <StatRow label="Salario" value={`${fmtK(revealedPlayer.salario)}/sem`} last />
            </Card>
            <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)' }}>
              <p className="text-sm" style={{ color: 'var(--acc)' }}>
                ✅ El jugador está disponible en <b>Mercado → Disponibles</b>. Puedes ficharlo, venderlo o cederlo.
              </p>
            </div>
            <Btn full onClick={() => setRevealed(null)}>Cerrar</Btn>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
