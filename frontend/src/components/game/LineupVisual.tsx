import { useState } from 'react';
import { useGameStore, useMyClub } from '@/stores/gameStore';
import { Bebas, Card, Tag, PosBadge, RatingBadge, Btn } from '@/components/ui';

// ─────────────────────────────────────────────────────────────
// F7-4: ALINEACIÓN VISUAL PARA MÓVIL
// ─────────────────────────────────────────────────────────────

const SISTEMAS: Record<string, { pos: string[]; slots: { pos: string; label: string; row: number; col: number }[] }> = {
  '4-4-2': {
    pos: ['POR','DEF','DEF','DEF','DEF','MED','MED','MED','MED','DEL','DEL'],
    slots: [
      { pos:'POR', label:'POR', row:5, col:2 },
      { pos:'DEF', label:'LI',  row:4, col:1 },
      { pos:'DEF', label:'DFC', row:4, col:2 },
      { pos:'DEF', label:'DFC', row:4, col:3 },
      { pos:'DEF', label:'LD',  row:4, col:4 },
      { pos:'MED', label:'MC',  row:3, col:1 },
      { pos:'MED', label:'MC',  row:3, col:2 },
      { pos:'MED', label:'MC',  row:3, col:3 },
      { pos:'MED', label:'MC',  row:3, col:4 },
      { pos:'DEL', label:'DC',  row:2, col:2 },
      { pos:'DEL', label:'DC',  row:2, col:3 },
    ],
  },
  '4-3-3': {
    pos: ['POR','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL','DEL'],
    slots: [
      { pos:'POR', label:'POR', row:5, col:2 },
      { pos:'DEF', label:'LI',  row:4, col:1 },
      { pos:'DEF', label:'DFC', row:4, col:2 },
      { pos:'DEF', label:'DFC', row:4, col:3 },
      { pos:'DEF', label:'LD',  row:4, col:4 },
      { pos:'MED', label:'MC',  row:3, col:1 },
      { pos:'MED', label:'MCC', row:3, col:2 },
      { pos:'MED', label:'MC',  row:3, col:3 },
      { pos:'DEL', label:'EI',  row:2, col:1 },
      { pos:'DEL', label:'DC',  row:2, col:2 },
      { pos:'DEL', label:'ED',  row:2, col:3 },
    ],
  },
  '5-3-2': {
    pos: ['POR','DEF','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL'],
    slots: [
      { pos:'POR', label:'POR', row:5, col:3 },
      { pos:'DEF', label:'LI',  row:4, col:1 },
      { pos:'DEF', label:'DFC', row:4, col:2 },
      { pos:'DEF', label:'DFC', row:4, col:3 },
      { pos:'DEF', label:'DFC', row:4, col:4 },
      { pos:'DEF', label:'LD',  row:4, col:5 },
      { pos:'MED', label:'MI',  row:3, col:1 },
      { pos:'MED', label:'MC',  row:3, col:3 },
      { pos:'MED', label:'MD',  row:3, col:5 },
      { pos:'DEL', label:'DC',  row:2, col:2 },
      { pos:'DEL', label:'DC',  row:2, col:4 },
    ],
  },
  '4-2-3-1': {
    pos: ['POR','DEF','DEF','DEF','DEF','MED','MED','MED','MED','MED','DEL'],
    slots: [
      { pos:'POR', label:'POR', row:5, col:2 },
      { pos:'DEF', label:'LI',  row:4, col:1 },
      { pos:'DEF', label:'DFC', row:4, col:2 },
      { pos:'DEF', label:'DFC', row:4, col:3 },
      { pos:'DEF', label:'LD',  row:4, col:4 },
      { pos:'MED', label:'MCD', row:3, col:1 },
      { pos:'MED', label:'MCD', row:3, col:3 },
      { pos:'MED', label:'MAI', row:2, col:1 },
      { pos:'MED', label:'MAC', row:2, col:2 },
      { pos:'MED', label:'MAD', row:2, col:3 },
      { pos:'DEL', label:'DC',  row:1, col:2 },
    ],
  },
};

const POS_COLORS: Record<string, string> = {
  POR: '#f97316', DEF: '#3b82f6', MED: '#22c55e', DEL: '#ef4444',
};

export function LineupVisual({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, setLineup } = useGameStore();
  const club    = useMyClub()!;
  const sistema = state?.tactica.sistema ?? '4-4-2';
  const config  = SISTEMAS[sistema] ?? SISTEMAS['4-4-2'];

  const [alineacion, setAlineacion] = useState<(string|null)[]>(
    () => {
      const ids = state?.alineacion?.slice(0, 11) ?? [];
      return config.slots.map((_, i) => ids[i] ?? null);
    }
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const titularIds  = new Set(alineacion.filter(Boolean) as string[]);
  const disponibles = club.plantilla.filter(p =>
    !p.lesionado && !p.convocado && !p.tarjetas_rojas && !titularIds.has(p.id)
  );

  // Validaciones
  const extraComunitarios = alineacion
    .filter(Boolean)
    .map(id => club.plantilla.find(p => p.id === id))
    .filter(p => p?.nacionalidad === 'EX').length;
  const incompleta = alineacion.some(id => !id);
  const valid = !incompleta && extraComunitarios <= 3;

  function assignPlayer(playerId: string) {
    if (selectedSlot === null) return;
    const newAlin = [...alineacion];
    // Si el jugador ya está en otro slot, intercambiar
    const oldSlot = newAlin.findIndex(id => id === playerId);
    if (oldSlot !== -1) newAlin[oldSlot] = newAlin[selectedSlot];
    newAlin[selectedSlot] = playerId;
    setAlineacion(newAlin);
    setSelectedSlot(null);
  }

  function clearSlot(slotIdx: number) {
    const newAlin = [...alineacion];
    newAlin[slotIdx] = null;
    setAlineacion(newAlin);
    setSelectedSlot(null);
  }

  async function handleSave() {
    if (!valid) { onToast(incompleta ? 'La alineación está incompleta' : 'Máx 3 extracomunitarios', 'err'); return; }
    setSaving(true);
    try {
      const suplentes = club.plantilla
        .filter(p => !p.lesionado && !p.convocado && !titularIds.has(p.id))
        .sort((a, b) => b.media - a.media)
        .slice(0, 7).map(p => p.id);
      await setLineup([...(alineacion.filter(Boolean) as string[]), ...suplentes]);
      onToast('✅ Alineación guardada');
    } catch (e: any) { onToast(e.message, 'err'); }
    setSaving(false);
  }

  // Grid rendering: max 5 columns, 5 rows
  const maxCols = Math.max(...config.slots.map(s => s.col));
  const colWidth = `${Math.floor(100 / maxCols)}%`;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Bebas size={18}>⚽ Alineación</Bebas>
        <div className="flex items-center gap-2">
          {extraComunitarios > 0 && (
            <Tag color={extraComunitarios <= 3 ? 'gold' : 'red'}>
              🌍 {extraComunitarios}/3 EX
            </Tag>
          )}
          <Tag color={incompleta ? 'red' : 'green'}>{11 - alineacion.filter(Boolean).length} libre{alineacion.filter(Boolean).length !== 10 ? 's' : ''}</Tag>
        </div>
      </div>

      {/* Campo visual */}
      <div className="relative rounded-2xl overflow-hidden mb-4"
        style={{ background: 'linear-gradient(180deg,#1a5c2a 0%,#1d6b30 50%,#1a5c2a 100%)', paddingBottom: 'min(130%, 380px)', border: '2px solid rgba(255,255,255,0.1)' }}>

        {/* Líneas de campo */}
        <div className="absolute inset-0 flex flex-col justify-around items-center pointer-events-none">
          <div className="w-full h-px bg-white opacity-20" />
          <div className="w-3/5 h-px bg-white opacity-15" />
          <div className="w-full h-px bg-white opacity-20" style={{ marginTop: '8%' }} />
          <div className="w-3/5 h-px bg-white opacity-15" />
          <div className="w-full h-px bg-white opacity-20" />
        </div>

        {/* Círculo central */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white opacity-20 pointer-events-none" />

        {/* Slots de jugadores */}
        {config.slots.map((slot, i) => {
          const playerId = alineacion[i];
          const player   = playerId ? club.plantilla.find(p => p.id === playerId) : null;
          const isSelected = selectedSlot === i;
          const top  = `${(slot.row - 1) / 5 * 100}%`;
          const left = `${(slot.col - 1) / maxCols * 100 + (100 / maxCols / 2)}%`;

          return (
            <div key={i}
              onClick={() => {
                if (isSelected) { setSelectedSlot(null); return; }
                setSelectedSlot(i);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ top, left, zIndex: 10 }}>

              {player ? (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white relative"
                    style={{
                      background: POS_COLORS[player.pos] ?? '#888',
                      border: `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.4)'}`,
                      boxShadow: isSelected ? '0 0 12px rgba(255,255,255,0.8)' : 'none',
                    }}>
                    {player.media}
                    {player.emocion === 'enfadado' && (
                      <span className="absolute -top-1 -right-1 text-xs">😡</span>
                    )}
                  </div>
                  <div className="bg-black bg-opacity-70 rounded px-1 text-center" style={{ minWidth: 36 }}>
                    <p className="text-xs font-bold text-white truncate" style={{ maxWidth: 52, fontSize: 9 }}>
                      {player.apellido.split(' ')[0].slice(0, 7)}
                    </p>
                  </div>
                  {isSelected && (
                    <button onClick={e => { e.stopPropagation(); clearSlot(i); }}
                      className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white mt-0.5">✕</button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? '#fff' : POS_COLORS[slot.pos] ?? '#888',
                      background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
                      boxShadow: isSelected ? '0 0 12px rgba(255,255,255,0.8)' : 'none',
                    }}>
                    <span className="text-xs font-bold" style={{ color: isSelected ? '#fff' : POS_COLORS[slot.pos] }}>
                      {slot.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instrucción */}
      {selectedSlot !== null && (
        <div className="rounded-xl p-2 mb-3 text-center text-sm"
          style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid var(--acc)40', color: 'var(--acc)' }}>
          Slot {config.slots[selectedSlot].label} seleccionado — elige un jugador abajo
        </div>
      )}

      {/* Jugadores disponibles */}
      {selectedSlot !== null && (
        <div className="overflow-y-auto mb-3" style={{ maxHeight: 'min(192px,40vh)', WebkitOverflowScrolling: 'touch' }}>
          <Bebas size={13} color="var(--tx2)" className="mb-2">
            Jugadores disponibles para {config.slots[selectedSlot].label} ({config.slots[selectedSlot].pos})
          </Bebas>
          {disponibles
            .sort((a, b) => {
              const posMatch = (p: any) => p.pos === config.slots[selectedSlot!].pos ? -1 : 0;
              return posMatch(a) - posMatch(b) || b.media - a.media;
            })
            .map(p => (
              <div key={p.id}
                onClick={() => assignPlayer(p.id)}
                className="flex items-center gap-3 p-2.5 rounded-xl mb-1 cursor-pointer active:scale-95"
                style={{ background: p.pos === config.slots[selectedSlot!].pos ? 'rgba(0,229,160,0.1)' : 'var(--sur2)', border: '1px solid var(--bor)', transition: 'all 0.1s' }}>
                <RatingBadge rating={p.media} size={36} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p.nombre} {p.apellido}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PosBadge pos={p.pos} />
                    <span className="text-xs" style={{ color: 'var(--tx3)' }}>{p.edad}a · Forma {p.forma}</span>
                    {p.nacionalidad === 'EX' && <Tag color="red">🌍 EX</Tag>}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Validaciones y guardar */}
      {extraComunitarios > 3 && (
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--dan)40' }}>
          <p className="text-sm" style={{ color: 'var(--dan)' }}>
            🚫 {extraComunitarios} extracomunitarios en el once. Máximo permitido: 3.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Btn full loading={saving} onClick={handleSave}
          style={valid ? { background: 'var(--acc)', color: '#000' } as any : {}}>
          💾 Guardar alineación
        </Btn>
        <Btn full variant="secondary" onClick={() => {
          setAlineacion(config.slots.map((_, i) => state?.alineacion?.[i] ?? null));
          setSelectedSlot(null);
        }}>
          ↩️ Restaurar
        </Btn>
      </div>

      {/* Suplentes */}
      <Bebas size={14} color="var(--tx2)" className="mb-2 mt-4">Suplentes</Bebas>
      <div className="flex flex-wrap gap-2">
        {club.plantilla
          .filter(p => !p.lesionado && !p.convocado && !titularIds.has(p.id))
          .sort((a, b) => b.media - a.media)
          .slice(0, 7)
          .map(p => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
              style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
              <RatingBadge rating={p.media} size={28} />
              <p className="text-xs">{p.apellido.split(' ')[0].slice(0, 8)}</p>
              <PosBadge pos={p.pos} />
            </div>
          ))}
      </div>
    </div>
  );
}
