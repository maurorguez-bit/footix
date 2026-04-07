import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore, useMyClub, useStandings, useMyPosition } from '@/stores/gameStore';
import { Bebas, Btn, Card, StatRow, Tag, FormDots, RatingBadge, PosBadge, fmtK, BottomSheet, Toast, Tabs, Progress, Empty, LoadingScreen } from '@/components/ui';
import type { MatchResult, Player } from '@shared/types/index';
import { CanteraTab } from '@/components/game/CanteraTab';
import { TransferHistoryTab, IntercambioModal, ScoutingActiveTab } from '@/components/game/AdvancedTabs';
import { QADebugTab } from '@/components/game/QADebugTab';
import { LineupVisual } from '@/components/game/LineupVisual';
import { LootTab } from '@/components/game/LootTab';
import { ManagerTab } from '@/components/game/ManagerTab';
import { PreseasonPage } from './PreseasonPage';
import { EndSeasonPage } from './EndSeasonPage';

// ── Nav tabs ──────────────────────────────────────────────────
const NAV = [
  { id:'dashboard', label:'Inicio',   icon:'⚡' },
  { id:'plantilla', label:'Plantilla',icon:'👥' },
  { id:'partido',   label:'Partido',  icon:'⚽' },
  { id:'mercado',   label:'Mercado',  icon:'🏪' },
  { id:'club',      label:'Club',     icon:'🏟️' },
  { id:'liga',      label:'Liga',     icon:'🏆' },
  { id:'cantera',   label:'Cantera',  icon:'🌱' },
  { id:'manager',   label:'Manager',  icon:'👔' },
  { id:'loot',      label:'Loot',     icon:'📦' },
  { id:'traspasos',  label:'Traspasos', icon:'📋' },
  { id:'scouting',   label:'Scouting',  icon:'🔭' },
  { id:'alineacion', label:'Once',      icon:'🏃' },
  { id:'qa',         label:'QA Debug',  icon:'🔧' },
];

export function GamePage() {
  const { slot } = useParams<{ slot: string }>();
  const slotN = parseInt(slot!);
  const navigate = useNavigate();

  const { state, loadGame, liveActive } = useGameStore();
  const club = useMyClub();
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  function showToast(msg: string, type: 'ok'|'err' = 'ok') {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (!state) { loadGame(slotN).catch(() => navigate('/saves')); }
  }, []);

  if (!state) return <LoadingScreen label="Cargando partida..." />;
  if (!club) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg)' }}>
      <p className="font-bebas text-xl mb-2" style={{ color: 'var(--dan)' }}>Club no encontrado</p>
      <p className="text-sm mb-4" style={{ color: 'var(--tx2)' }}>El estado de la partida puede estar corrupto.</p>
      <button onClick={() => window.location.href = '/saves'}
        className="px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'var(--acc)', color: '#000' }}>
        Volver a partidas guardadas
      </button>
    </div>
  );

  // ── Phase routing ─────────────────────────────────────────
  if (state.fase === 'pretemporada' || state.fase === 'amistosos') {
    return <PreseasonPage onToast={showToast} />;
  }
  if (state.fase === 'finTemporada' || state.temporadaTerminada) {
    return <EndSeasonPage onToast={showToast} />;
  }
  // Mercado de invierno sigue en GamePage (acceso normal a todas las pestañas)
  // Se muestra banner informativo en DashboardTab

  // Phase banner info
  const phaseInfo: Record<string, { label: string; color: string }> = {
    pretemporada:    { label: '☀️ Pretemporada', color: 'var(--gol)' },
    liga:            { label: '⚽ Liga en curso', color: 'var(--acc)' },
    mercadoInvierno: { label: '❄️ Mercado de invierno', color: 'var(--acc3)' },
    finTemporada:    { label: '🏁 Temporada terminada', color: 'var(--tx2)' },
  };
  const phase    = phaseInfo[state.fase] ?? phaseInfo.liga;
  const jornadaLabel = state.fase === 'liga' || state.fase === 'mercadoInvierno'
    ? `J${state.jornada}/${state.calendario?.length ?? 38}`
    : state.fase === 'pretemporada' ? 'Pretemporada' : 'Fin de temporada';

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: 'var(--bg)' }}>
      {/* Global toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-2 pb-2 flex justify-between items-center"
        style={{ background: 'var(--sur)', borderBottom: '1px solid var(--bor)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{club.escudo}</span>
            <Bebas size={18}>{club.nombre}</Bebas>
          </div>
          <p className="text-xs font-mono" style={{ color: 'var(--tx2)' }}>
            {['D1','D2','D3'][club.div]} · J{state.jornada}/{state.calendario.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: `${phase.color}20`, color: phase.color }}>
            {phase.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {tab === 'dashboard'  && <DashboardTab   onToast={showToast} />}
        {tab === 'plantilla'  && <PlantillaTab   onToast={showToast} />}
        {tab === 'partido'    && <PartidoTab      onToast={showToast} />}
        {tab === 'mercado'    && <MercadoTab      onToast={showToast} />}
        {tab === 'club'       && <ClubTab         onToast={showToast} />}
        {tab === 'liga'       && <LigaTab />}
        {tab === 'cantera'    && <CanteraTab onToast={showToast} />}
        {tab === 'manager'    && <ManagerTab onToast={showToast} />}
        {tab === 'loot'       && <LootTab onToast={showToast} />}
        {tab === 'traspasos'  && <TransferHistoryTab />}
        {tab === 'scouting'   && <ScoutingActiveTab onToast={showToast} />}
        {tab === 'alineacion' && <LineupVisual onToast={showToast} />}
        {tab === 'qa'          && <QADebugTab />}
      </div>

      {/* Bottom nav — locked during live match */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex"
        style={{ background: 'var(--sur)', borderTop: '1px solid var(--bor)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(n => {
          const locked = liveActive && n.id !== 'partido';
          return (
            <button key={n.id}
              onClick={() => !locked && setTab(n.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{ color: locked ? 'var(--tx3)' : tab === n.id ? 'var(--acc)' : 'var(--tx3)', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1 }}>
              <span className="text-lg leading-none">{n.icon}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide">{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────

function DashboardTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, newSeason } = useGameStore();
  const club    = useMyClub()!;
  const pos     = useMyPosition();
  const standings = useStandings();

  const lastRes = [...(state?.resultados ?? [])]
    .filter(r => r.localId === state?.clubId || r.visitanteId === state?.clubId)
    .pop();

  async function handleNewSeason() {
    try { await newSeason(); onToast('✅ ¡Nueva temporada iniciada!'); }
    catch (e: any) { onToast(e.message, 'err'); }
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: `${pos}º`, l: 'Clasificación' },
          { v: club.pts,  l: 'Puntos', c: 'var(--acc)' },
          { v: fmtK(club.presupuesto), l: 'Presupuesto' },
          { v: `${club.pg}/${club.pe}/${club.pp}`, l: 'V/E/D' },
        ].map((x, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
            <p className="font-bebas text-2xl" style={{ color: (x as any).c ?? 'var(--tex)' }}>{x.v}</p>
            <p className="text-xs uppercase tracking-wide mt-0.5" style={{ color: 'var(--tx2)' }}>{x.l}</p>
          </div>
        ))}
      </div>

      {/* Club info */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">Estado del Club</Bebas>
        <StatRow label="Temporada"  value={state!.temporada} />
        <StatRow label="Objetivo"   value={club.objetivo} />
        <StatRow label="Reputación" value={`${club.rep}/100`} />
        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--bor)' }}>
          <span className="text-sm" style={{ color: 'var(--tx2)' }}>Forma</span>
          {club.forma.length ? <FormDots forma={club.forma} /> : <span className="text-xs" style={{ color: 'var(--tx3)' }}>Sin partidos</span>}
        </div>
        {lastRes && <LastResultMini res={lastRes} clubId={state!.clubId} liga={state!.liga} />}
      </Card>

      {/* Events */}
      {state!.eventosActivos.filter(e => !e.resuelto).length > 0 && (
        <EventsBanner onToast={onToast} />
      )}

      {/* Trivial prompt */}
      {/* F4-4: déficit crónico y bloqueo */}
      {(state!.bloqueadoPorDeuda || state!.advertenciaDirectiva) && (
        <div className="rounded-xl p-3" style={{ background: state!.bloqueadoPorDeuda ? 'rgba(255,71,87,0.12)' : 'rgba(255,107,53,0.1)', border: `1px solid ${state!.bloqueadoPorDeuda ? 'var(--dan)' : 'var(--acc2)'}40` }}>
          <p className="text-sm font-semibold" style={{ color: state!.bloqueadoPorDeuda ? 'var(--dan)' : 'var(--acc2)' }}>
            {state!.bloqueadoPorDeuda
              ? '🚫 Fichajes bloqueados por déficit crónico'
              : '⚠️ Advertencia de directiva: sanea las finanzas'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--tx2)' }}>
            {state!.jornadasEnDeficit} jornada{state!.jornadasEnDeficit !== 1 ? 's' : ''} en déficit · Genera ingresos o vende jugadores
          </p>
        </div>
      )}

      {/* F6-4: promesas de minutos activas */}
      {(state!.promesasMinutos ?? []).length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--gol)' }}>⏱ Promesas de minutos activas</p>
          {(state!.promesasMinutos ?? []).map((pm: any) => (
            <div key={pm.playerId} className="flex justify-between items-center mt-1">
              <p className="text-xs" style={{ color: 'var(--tx2)' }}>{pm.playerNombre}</p>
              <p className="text-xs font-mono" style={{ color: pm.partidosJugados >= pm.minPartidos ? 'var(--acc)' : 'var(--gol)' }}>
                {pm.partidosJugados}/{pm.minPartidos} partidos · {pm.jornadaLimite - state!.jornada}j restantes
              </p>
            </div>
          ))}
        </div>
      )}

      {/* F4-3: convocados ausentes */}
      {(() => {
        const convocados = state!.liga.find(c => c.id === state!.clubId)?.plantilla.filter(p => p.convocado) ?? [];
        if (convocados.length === 0) return null;
        return (
          <div className="rounded-xl p-3" style={{ background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--acc3)' }}>🌍 Ausentes por selección</p>
            {convocados.map(p => (
              <p key={p.id} className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
                {p.nombre} {p.apellido} — vuelve en {p.convocadoJornadas} jornada{p.convocadoJornadas !== 1 ? 's' : ''}
              </p>
            ))}
          </div>
        );
      })()}

      {state!.trivialJornada < state!.jornada && state!.fase === 'liga' && (
        <TrivialBanner onToast={onToast} />
      )}

      {/* End season */}
      {state!.fase === 'finTemporada' && (
        <Card className="text-center">
          <p className="text-4xl mb-2">🏁</p>
          <Bebas size={20} className="mb-3">Temporada terminada</Bebas>
          <Btn full onClick={handleNewSeason}>🔄 Nueva Temporada</Btn>
        </Card>
      )}

      {/* News feed */}
      <NewsFeed />

      {/* Loot boxes — ver pestaña 📦 Loot */}
      {(state!.lootBoxes ?? []).filter(b => !b.contenido).length > 0 && (
        <div onClick={() => {}} className="rounded-xl p-3 cursor-pointer" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--gol)' }}>📦 Tienes {state!.lootBoxes.filter(b => !b.contenido).length} loot box{state!.lootBoxes.filter(b=>!b.contenido).length!==1?'es':''} sin abrir → pestaña Loot</p>
        </div>
      )}

      {/* Manager */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">Manager</Bebas>
        <StatRow label="Reputación" value={`${state!.repManager}/100`} />
        <Progress value={state!.repManager} className="mt-1 mb-2" />
        <StatRow label="XP" value={state!.xpManager} last />
      </Card>
    </div>
  );
}

function LastResultMini({ res, clubId, liga }: { res: MatchResult; clubId: string; liga: any[] }) {
  const isLocal = res.localId === clubId;
  const myG     = isLocal ? res.golesLocal : res.golesVisitante;
  const rivG    = isLocal ? res.golesVisitante : res.golesLocal;
  const rival   = liga.find((c: any) => c.id === (isLocal ? res.visitanteId : res.localId));
  const color   = myG > rivG ? 'var(--acc)' : myG === rivG ? 'var(--gol)' : 'var(--dan)';
  const letra   = myG > rivG ? 'V' : myG === rivG ? 'E' : 'D';
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold" style={{ background: `${color}20`, color }}>{letra}</span>
      <span className="text-sm" style={{ color: 'var(--tx2)' }}>vs {rival?.nombre} <b style={{ color: 'var(--tex)' }}>{myG}-{rivG}</b></span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PLANTILLA TAB
// ─────────────────────────────────────────────────────────────

function PlantillaTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, sellPlayer, trainPlayers, upgradePlayer } = useGameStore();
  const club = useMyClub()!;
  const [filter, setFilter] = useState('');
  const [sort, setSort]     = useState('media');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selling, setSelling] = useState(false);
  const [precio, setPrecio]   = useState(0);
  const [trainModal, setTrainModal] = useState(false);
  const [trainType, setTrainType]   = useState('fisico');
  const [selected, setSelected]     = useState<Set<string>>(new Set());

  const alinIds = new Set(state?.alineacion?.slice(0, 11) ?? []);
  const les   = club.plantilla.filter(p => p.lesionado).length;
  const san   = club.plantilla.filter(p => p.tarjetas_rojas > 0).length;

  let players = [...club.plantilla].filter(p => !filter || p.pos === filter);
  if (sort === 'media') players.sort((a, b) => b.media - a.media);
  else if (sort === 'forma') players.sort((a, b) => b.forma - a.forma);
  else if (sort === 'edad') players.sort((a, b) => a.edad - b.edad);
  else players.sort((a, b) => b.valor - a.valor);

  async function handleSell() {
    if (!selectedPlayer) return;
    try {
      const r = await sellPlayer(selectedPlayer.id, precio || selectedPlayer.valor);
      onToast(r.vendido ? `💰 Vendido por ${fmtK(precio)}` : (r.mensaje ?? 'En el mercado'));
      setSelling(false); setSelectedPlayer(null);
    } catch (e: any) { onToast(e.message, 'err'); }
  }

  async function handleTrain() {
    if (selected.size === 0) { onToast('Selecciona al menos un jugador para entrenar', 'err'); return; }
    try {
      await trainPlayers(trainType, [...selected]);
      onToast('✅ Entrenamiento realizado');
      setTrainModal(false); setSelected(new Set());
    } catch (e: any) { onToast(e.message, 'err'); }
  }

  return (
    <div className="p-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { v: club.plantilla.length - les - san, l: 'Disponibles', c: 'var(--acc)' },
          { v: les,  l: '🚑 Lesionados', c: 'var(--dan)' },
          { v: san,  l: '🟥 Sancionados', c: 'var(--acc2)' },
        ].map((x, i) => (
          <div key={i} className="rounded-xl p-2 text-center" style={{ background: `${x.c}12`, border: `1px solid ${x.c}30` }}>
            <p className="font-bebas text-2xl" style={{ color: x.c }}>{x.v}</p>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>{x.l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '8px 10px' }}>
          <option value="">Todos ({club.plantilla.length})</option>
          {['POR','DEF','MED','DEL'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '8px 10px' }}>
          <option value="media">Media</option>
          <option value="forma">Forma</option>
          <option value="edad">Edad</option>
          <option value="valor">Valor</option>
        </select>
      </div>

      <Btn variant="secondary" small className="mb-3 w-full" onClick={() => setTrainModal(true)}>🏋️ Sesión de Entrenamiento</Btn>

      {/* Player list */}
      <Card className="!p-0 overflow-hidden">
        {players.map((p, i) => {
          const noDisp = p.lesionado || p.tarjetas_rojas > 0;
          return (
            <div key={p.id} onClick={() => setSelectedPlayer(p)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-[var(--sur2)]"
              style={{ borderBottom: i < players.length - 1 ? '1px solid var(--bor)' : 'none', opacity: noDisp ? 0.6 : 1 }}>
              <div className="relative flex-shrink-0">
                <RatingBadge rating={p.media} />
                {p.lesionado && <div className="absolute inset-0 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(255,71,87,0.8)' }}>🚑</div>}
                {!p.lesionado && p.tarjetas_rojas > 0 && <div className="absolute inset-0 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(255,107,53,0.8)' }}>🟥</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{p.nombre} {p.apellido}</span>
                  {p.tarjetas_amarillas >= 4 && !noDisp && <span title="Riesgo sanción">⚠️</span>}
                  {(p as any).fatiga > 75 && <span title="Muy cansado">🔴</span>}
                  {(p as any).fatiga > 55 && (p as any).fatiga <= 75 && <span title="Cansado">🟡</span>}
                  {(p as any).jornadasSinJugar >= 5 && <span title="Sin minutos — pierde forma">📉</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <PosBadge pos={p.pos} />
                  <span className="text-xs font-mono" style={{ color: 'var(--tx2)' }}>{p.edad}a</span>
                  <span className="text-xs font-mono px-1 py-0.5 rounded" style={{ background: p.nacionalidad === 'EX' ? 'rgba(255,107,53,0.15)' : p.nacionalidad === 'EU' ? 'rgba(74,158,255,0.15)' : 'rgba(0,229,160,0.1)', color: p.nacionalidad === 'EX' ? 'var(--acc2)' : p.nacionalidad === 'EU' ? 'var(--acc3)' : 'var(--acc)', fontSize: 9 }}>
                    {p.pais}
                  </span>
                  {alinIds.has(p.id) && !noDisp && <Tag color="green">TITULAR</Tag>}
                  {p.lesionado && <Tag color="red">🚑 {p.lesion_jornadas}j</Tag>}
                  {(p as any).convocado && <Tag color="blue">🌍 {(p as any).convocadoJornadas}j</Tag>}
                  {p.emocion === 'insatisfecho' && !noDisp && <Tag color="gold">😤</Tag>}
                  {p.emocion === 'enfadado' && !noDisp && <Tag color="red">😡</Tag>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
                <p className="text-xs mt-0.5" style={{ color: p.forma >= 75 ? 'var(--acc)' : p.forma >= 55 ? 'var(--gol)' : 'var(--dan)' }}>F{p.forma}</p>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Player detail modal */}
      <BottomSheet open={!!selectedPlayer && !selling} onClose={() => setSelectedPlayer(null)} title={selectedPlayer ? `${selectedPlayer.nombre} ${selectedPlayer.apellido}` : ''}>
        {selectedPlayer && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <RatingBadge rating={selectedPlayer.media} size={52} />
              <div>
                <p className="font-semibold">{selectedPlayer.pos} · {selectedPlayer.edad} años</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                    style={{ background: selectedPlayer.nacionalidad === 'EX' ? 'rgba(255,107,53,0.2)' : selectedPlayer.nacionalidad === 'EU' ? 'rgba(74,158,255,0.2)' : 'rgba(0,229,160,0.15)', color: selectedPlayer.nacionalidad === 'EX' ? 'var(--acc2)' : selectedPlayer.nacionalidad === 'EU' ? 'var(--acc3)' : 'var(--acc)' }}>
                    {selectedPlayer.pais}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--tx3)' }}>
                    {selectedPlayer.nacionalidad === 'EX' ? 'Extracomunitario' : selectedPlayer.nacionalidad === 'EU' ? 'Comunitario' : 'Nacional'}
                  </span>
                </div>
                <p className="text-sm font-mono mt-1" style={{ color: 'var(--tx2)' }}>{fmtK(selectedPlayer.valor)}</p>
              </div>
            </div>
            <Card>
              <StatRow label="Potencial" value={selectedPlayer.potencial} />
              <StatRow label="Forma" value={`${selectedPlayer.forma}/100`} valueColor={selectedPlayer.forma >= 70 ? 'var(--acc)' : selectedPlayer.forma >= 50 ? 'var(--gol)' : 'var(--dan)'} />
              <StatRow label="Físico" value={`${selectedPlayer.fisico}/100`} valueColor={selectedPlayer.fisico >= 70 ? 'var(--acc)' : 'var(--gol)'} />
              <StatRow label="Fatiga" value={`${(selectedPlayer as any).fatiga ?? 0}/100`} valueColor={(selectedPlayer as any).fatiga > 70 ? 'var(--dan)' : 'var(--acc)'} />
              <StatRow label="Sin jugar" value={`${(selectedPlayer as any).jornadasSinJugar ?? 0} jornadas`} valueColor={(selectedPlayer as any).jornadasSinJugar >= 5 ? 'var(--acc2)' : 'var(--tex)'} />
              <StatRow label="Moral" value={selectedPlayer.emocion} />
              <StatRow label="Salario/sem" value={fmtK(selectedPlayer.salario)} />
              <StatRow label="Cláusula" value={fmtK(selectedPlayer.clausula)} />
              <StatRow label="Contrato" value={`${selectedPlayer.contrato} años`} last />
            </Card>
            <Card>
              <StatRow label="Partidos" value={selectedPlayer.partidos} />
              <StatRow label="Goles" value={selectedPlayer.goles} />
              <StatRow label="Nota media" value={selectedPlayer.notaMedia || '—'} />
              <StatRow label="Amarillas" value={selectedPlayer.tarjetas_amarillas} />
              <StatRow label="Rojas" value={selectedPlayer.tarjetas_rojas} last />
            </Card>
            {/* F3-2: Mejorar atributo con XP + dinero */}
            <div className="mb-2">
              <p className="text-xs mb-1.5 font-semibold" style={{ color: 'var(--tx2)' }}>
                ⚡ Mejorar con XP (tienes {state!.xpManager} XP)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { a: 'media',  label: 'Media',  xp: 500,  din: 500000 },
                  { a: 'fisico', label: 'Físico', xp: 200,  din: 100000 },
                  { a: 'forma',  label: 'Forma',  xp: 100,  din: 50000  },
                  { a: 'moral',  label: 'Moral',  xp: 80,   din: 20000  },
                ] as const).map(({ a, label, xp, din }) => {
                  const canAfford = state!.xpManager >= xp && (state!.liga.find(cl => cl.id === state!.clubId)?.presupuesto ?? 0) >= din;
                  return (
                    <button key={a}
                      disabled={!canAfford}
                      onClick={async () => {
                        try {
                          await upgradePlayer(selectedPlayer.id, a);
                          setSelectedPlayer(null);
                        } catch(e:any) { onToast(e.message, 'err'); }
                      }}
                      className="py-2 px-2 rounded-lg text-xs font-semibold"
                      style={{ background: canAfford ? 'var(--sur2)' : 'var(--sur)', border: `1px solid ${canAfford ? 'var(--acc)' : 'var(--bor)'}`, color: canAfford ? 'var(--acc)' : 'var(--tx3)', opacity: canAfford ? 1 : 0.5 }}>
                      +1 {label}<br/>
                      <span style={{ fontWeight: 400, fontSize: 9 }}>{xp} XP · {(din/1000).toFixed(0)}K€</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Btn variant="danger" full onClick={() => { setPrecio(selectedPlayer.valor); setSelling(true); }}>Poner en venta</Btn>
          </>
        )}
      </BottomSheet>

      {/* Sell modal */}
      <BottomSheet open={selling} onClose={() => setSelling(false)} title="Poner en Venta">
        {selectedPlayer && (
          <>
            <p className="font-bold mb-3">{selectedPlayer.nombre} {selectedPlayer.apellido}</p>
            <Card><StatRow label="Valor" value={fmtK(selectedPlayer.valor)} /><StatRow label="Cláusula" value={fmtK(selectedPlayer.clausula)} last /></Card>
            <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Precio de venta</label>
            <input type="number" inputMode="numeric" value={precio || ''} onChange={e => setPrecio(parseInt(e.target.value.replace(/\D/g,'')) || 0)} step={50000} className="mb-3" placeholder="Precio de venta" />
            <div className="flex gap-2">
              <Btn full onClick={handleSell}>✅ Confirmar</Btn>
              <Btn full variant="secondary" onClick={() => setSelling(false)}>Cancelar</Btn>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Train modal */}
      <BottomSheet open={trainModal} onClose={() => setTrainModal(false)} title="Sesión de Entrenamiento">
        <select value={trainType} onChange={e => setTrainType(e.target.value)} className="mb-3">
          <option value="fisico">🏃 Físico — Mejora resistencia</option>
          <option value="tecnico">⚽ Técnico — Mejora media</option>
          <option value="tactico">🧠 Táctico — Mejora forma</option>
          <option value="recuperacion">🛌 Recuperación — Restaura físico</option>
        </select>
        <p className="text-xs mb-2" style={{ color: 'var(--tx2)' }}>Selecciona jugadores ({selected.size} seleccionados)</p>
        <div className="max-h-48 overflow-y-auto mb-3">
          {club.plantilla.filter(p => !p.lesionado).map(p => (
            <div key={p.id} onClick={() => setSelected(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
              className="flex items-center gap-2 py-2 px-1 cursor-pointer rounded" style={{ background: selected.has(p.id) ? 'var(--acc)15' : 'transparent' }}>
              <div className="w-4 h-4 rounded border flex items-center justify-center" style={{ borderColor: selected.has(p.id) ? 'var(--acc)' : 'var(--bor)', background: selected.has(p.id) ? 'var(--acc)' : 'transparent' }}>
                {selected.has(p.id) && <span style={{ color: '#000', fontSize: 10 }}>✓</span>}
              </div>
              <RatingBadge rating={p.media} size={28} />
              <span className="text-sm">{p.nombre} {p.apellido}</span>
              <PosBadge pos={p.pos} />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Btn full onClick={handleTrain}>Entrenar</Btn>
          <Btn full variant="secondary" onClick={() => setTrainModal(false)}>Cancelar</Btn>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PARTIDO TAB (live match + tactic)
// ─────────────────────────────────────────────────────────────

function PartidoTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, simulate, setTactic, setLiveActive } = useGameStore();
  const club    = useMyClub()!;
  const [result, setResult]       = useState<any>(null);
  const [simming, setSimming]     = useState(false);
  const [live, setLive]           = useState<null|'1a'|'desc'|'2a'|'done'>(null);
  const [liveMin, setLiveMin]     = useState(0);
  const [livePoss, setLivePoss]   = useState(50);
  const [liveGL, setLiveGL]       = useState(0);
  const [liveGV, setLiveGV]       = useState(0);
  const [liveNarr, setLiveNarr]   = useState<string>('');
  const [liveEvs, setLiveEvs]     = useState<any[]>([]);
  const [liveIsHome, setLiveIsHome] = useState(true); // derivado del resultado real
  const animRef = useRef<any>(null);

  const jIdx    = (state?.jornada ?? 1) - 1;
  // Buscar fixture en jornada actual O en la última jugada (jornada-1)
  const fixtureActual  = state?.calendario?.[jIdx]?.find(f => f.localId === state?.clubId || f.visitanteId === state?.clubId);
  const fixtureAnterior = jIdx > 0 ? state?.calendario?.[jIdx - 1]?.find(f => f.localId === state?.clubId || f.visitanteId === state?.clubId) : undefined;
  const fixture = fixtureActual ?? fixtureAnterior;
  // F1-1: isHome siempre basado en localId explícito, nunca undefined implícito
  const isHome  = fixture ? fixture.localId === state?.clubId : true;
  const rivalId = fixture ? (isHome ? fixture.visitanteId : fixture.localId) : undefined;
  const rival   = rivalId ? state?.liga.find(c => c.id === rivalId) : undefined;

  function startLive(res: any) {
    setLiveActive(true);
    setLive('1a'); setLiveMin(0); setLivePoss(50);
    setLiveGL(0); setLiveGV(0); setLiveNarr(''); setLiveEvs([]);
    const myResult = res.myResult;
    if (!myResult) return;
    // F1-1: derivar isHome del resultado, persistir en estado para el render
    const resolvedIsHome = myResult.localId === state?.clubId;
    setLiveIsHome(resolvedIsHome);
    const events = [...(myResult.eventos ?? [])].sort((a: any, b: any) => a.minuto - b.minuto);
    let step = 0;
    const totalSteps = 90;
    const ms = 60000 / totalSteps; // 60s total

    animRef.current = setInterval(() => {
      step++;
      if (step === 46) { setLive('desc'); setTimeout(() => setLive('2a'), 2000); }
      setLiveMin(step);
      setLivePoss(p => Math.min(85, Math.max(15, Math.round(p + (myResult.stats.posesionLocal - 50) * 0.05 + (Math.random() - 0.5) * 10))));

      // Show events at the right minute
      const ev = events.find((e: any) => e.minuto === step);
      if (ev) {
        if (ev.tipo === 'gol') {
          // F1-1: liveGL = goles del equipo LOCAL del partido (no del usuario)
          // La conversión a "mis goles" / "goles rival" se hace en render con liveIsHome
          if (ev.equipo === 'local') setLiveGL(g => g + 1);
          else setLiveGV(g => g + 1);
        }
        setLiveNarr(ev.descripcion);
        setLiveEvs(prev => [ev, ...prev].slice(0, 10));
      }

      if (step >= totalSteps) {
        clearInterval(animRef.current);
        setLive('done');
        setLiveActive(false);
      }
    }, ms);
  }

  async function handleSimulate() {
    setSimming(true);
    try {
      const res = await simulate();
      setResult(res);
      startLive(res);
    } catch (e: any) {
      onToast(e.message, 'err');
    } finally {
      setSimming(false);
    }
  }

  async function handleQuick() {
    setSimming(true);
    setResult(null); setLive(null); // F1-2: limpiar resultado anterior
    try {
      const res = await simulate();
      setResult(res);
      if (res.myResult) {
        const myG  = res.myResult.localId === state?.clubId ? res.myResult.golesLocal : res.myResult.golesVisitante;
        const rivG = res.myResult.localId === state?.clubId ? res.myResult.golesVisitante : res.myResult.golesLocal;
        const rival2 = state?.liga.find((cl: any) => cl.id === (res.myResult.localId === state?.clubId ? res.myResult.visitanteId : res.myResult.localId));
        const rivalNom = rival2?.nombre ?? 'rival';
        onToast(myG > rivG
          ? `✅ Victoria vs ${rivalNom} (${myG}-${rivG})`
          : myG === rivG
          ? `🤝 Empate vs ${rivalNom} (${myG}-${rivG})`
          : `❌ Derrota vs ${rivalNom} (${myG}-${rivG})`);
      }
    } catch (e: any) {
      onToast(e.message, 'err');
    } finally {
      setSimming(false);
    }
  }

  // Live match view
  if (live && live !== 'done') {
    // F1-1: liveIsHome viene del estado, derivado del resultado real
    const posLocal = liveIsHome ? livePoss : 100 - livePoss;
    const sL = liveIsHome ? liveGL : liveGV;
    const sV = liveIsHome ? liveGV : liveGL;
    return (
      <div className="p-4 flex flex-col gap-3">
        {/* Scoreboard */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#0d1f35,#0a2a1a)', border: '1px solid var(--bor)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono" style={{ color: live === 'desc' ? 'var(--gol)' : 'var(--dan)' }}>
              {live === 'desc' ? '⏸ DESCANSO' : '🔴 EN VIVO'}
            </span>
            {live !== 'desc' && <span className="text-xs font-mono" style={{ color: 'var(--tx2)' }}>{liveMin}'</span>}
          </div>
          <div className="flex items-center justify-between my-3">
            <p className="text-sm font-bold flex-1 text-center" style={{ color: liveIsHome ? 'var(--acc)' : 'var(--tex)' }}>{club.nombre}</p>
            <p className="font-bebas text-5xl tracking-widest mx-2" style={{ color: 'var(--tex)' }}>{sL}<span style={{ color: 'var(--tx3)', fontSize: 28 }}>-</span>{sV}</p>
            <p className="text-sm font-bold flex-1 text-center" style={{ color: !liveIsHome ? 'var(--acc)' : 'var(--tex)' }}>{rival?.nombre}</p>
          </div>
          {/* Possession bar */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span style={{ color: 'var(--acc)' }}>{posLocal}%</span>
              <span style={{ color: 'var(--tx3)', fontSize: 9 }}>POSESIÓN</span>
              <span style={{ color: 'var(--acc3)' }}>{100 - posLocal}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden relative" style={{ background: 'var(--bor)' }}>
              <div className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-300"
                style={{ width: `${posLocal}%`, background: `linear-gradient(90deg,var(--acc),var(--acc3))` }} />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xs transition-all duration-300"
                style={{ left: `${posLocal}%` }}>⚽</div>
            </div>
          </div>
        </div>

        {/* Narration */}
        {liveNarr && (
          <div className="rounded-xl p-3 text-sm italic" style={{ background: 'var(--sur2)', color: 'var(--tx2)', border: '1px solid var(--bor)', lineHeight: 1.5 }}>
            {liveNarr}
          </div>
        )}

        {/* Events feed */}
        <Card className="max-h-64 overflow-y-auto !pb-2">
          <Bebas size={13} color="var(--tx2)" className="mb-2">Incidencias</Bebas>
          {liveEvs.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--tx3)' }}>El partido está comenzando...</p>}
          {liveEvs.map((ev, i) => {
            const icon = ev.tipo === 'gol' ? '⚽' : ev.tipo === 'tarjeta' ? (ev.descripcion.includes('🟥') ? '🟥' : '🟨') : ev.tipo === 'lesion' ? '🚑' : '▸';
            const color = ev.tipo === 'gol' ? 'var(--acc)' : ev.tipo === 'lesion' ? 'var(--dan)' : 'var(--tx2)';
            return (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
                <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: 'var(--tx3)' }}>{ev.minuto}'</span>
                <span>{icon}</span>
                <p className="text-xs flex-1" style={{ color }}>{ev.descripcion}</p>
              </div>
            );
          })}
        </Card>
      </div>
    );
  }

  // Pre-match / post-match
  return (
    <div className="p-4 flex flex-col gap-3">
      {state?.fase !== 'liga' && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--acc2)' }}>
            {state?.fase === 'pretemporada' ? '☀️ Firma patrocinador e inicia la liga' : '❄️ Cierra el mercado de invierno para continuar'}
          </p>
        </div>
      )}

      {/* vs card */}
      {rival && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <span className="text-2xl">{club.escudo}</span>
              <p className="text-sm font-bold mt-1">{club.nombre}</p>
              <Tag color={isHome ? 'green' : 'gray'}>{isHome ? '🏠 LOCAL' : '✈️ VISIT.'}</Tag>
            </div>
            <p className="font-bebas text-2xl mx-3" style={{ color: 'var(--tx3)' }}>VS</p>
            <div className="flex-1 text-center">
              <span className="text-2xl">{rival.escudo}</span>
              <p className="text-sm font-bold mt-1">{rival.nombre}</p>
              <Tag color={!isHome ? 'green' : 'gray'}>{!isHome ? '🏠 LOCAL' : '✈️ VISIT.'}</Tag>
            </div>
          </div>
        </Card>
      )}

      {/* Tactic */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-3">Táctica</Bebas>
        <div className="mb-3">
          <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Sistema</label>
          <select value={state?.tactica.sistema} onChange={e => setTactic(e.target.value, state?.tactica.enfoque ?? 'equilibrado')}>
            {['4-4-2','4-3-3','5-3-2','4-2-3-1'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Enfoque</label>
          <select value={state?.tactica.enfoque} onChange={e => setTactic(state?.tactica.sistema ?? '4-4-2', e.target.value)}>
            {['defensivo','equilibrado','ofensivo'].map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
          </select>
        </div>
      </Card>

      {/* Simulate buttons */}
      {state?.fase === 'liga' && !state.temporadaTerminada && (
        fixtureActual ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={handleSimulate} loading={simming}
              style={{ background: 'linear-gradient(135deg,#0d3a20,var(--acc))', color: '#000', minHeight: 52 } as any}>
              🔴 En Vivo
            </Btn>
            <Btn variant="secondary" onClick={handleQuick} loading={simming}
              style={{ minHeight: 52 } as any}>⚡ Resultado</Btn>
          </div>
        ) : (
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--sur2)', border: '1px solid var(--bor)' }}>
            <p className="text-sm" style={{ color: 'var(--tx2)' }}>✅ Jornada {state.jornada - 1} completada</p>
            <p className="text-xs mt-1" style={{ color: 'var(--tx3)' }}>La jornada {state.jornada} comenzará pronto</p>
          </div>
        )
      )}

      {/* Last result — visible tanto con En Vivo (live=done) como con Resultado rápido (live=null) */}
      {result?.myResult && (live === 'done' || live === null) && (
        <MatchResultCard res={result.myResult} state={state!} />
      )}
    </div>
  );
}

function MatchResultCard({ res, state }: { res: MatchResult; state: any }) {
  const club  = state.liga.find((c: any) => c.id === state.clubId);
  const isL   = res.localId === state.clubId;
  const myG   = isL ? res.golesLocal  : res.golesVisitante;
  const rivG  = isL ? res.golesVisitante : res.golesLocal;
  const color = myG > rivG ? 'var(--acc)' : myG === rivG ? 'var(--gol)' : 'var(--dan)';
  const res_text = myG > rivG ? 'VICTORIA' : myG === rivG ? 'EMPATE' : 'DERROTA';

  // Ratings del equipo del usuario — filtrar por jugadores del club
  const myPlayerIds = new Set(club?.plantilla?.map((p: any) => p.id) ?? []);
  const myRatings   = (res.ratings ?? []).filter((r: any) => myPlayerIds.has(r.playerId))
                       .sort((a: any, b: any) => b.nota - a.nota);

  // Goleadores propios
  const myGoals = (res.goles ?? []).filter((g: any) =>
    (isL ? g.equipo === 'local' : g.equipo === 'visitante')
  );
  const rivalGoals = (res.goles ?? []).filter((g: any) =>
    (isL ? g.equipo === 'visitante' : g.equipo === 'local')
  );

  const [showRatings, setShowRatings] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-center mb-3">
          <p className="font-bebas text-lg" style={{ color }}>{res_text}</p>
          <p className="font-bebas text-4xl" style={{ color: 'var(--tex)' }}>
            {isL ? res.golesLocal : res.golesVisitante}
            <span style={{ color: 'var(--tx3)', fontSize: 28 }}> - </span>
            {isL ? res.golesVisitante : res.golesLocal}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--tx3)' }}>
            {isL ? club?.nombre : state.liga.find((c:any)=>c.id===res.localId)?.nombre} vs {isL ? state.liga.find((c:any)=>c.id===res.visitanteId)?.nombre : club?.nombre}
          </p>
        </div>

        {/* Goleadores */}
        {myGoals.length > 0 && (
          <div className="mb-2 p-2 rounded-lg" style={{ background: 'rgba(0,229,160,0.08)' }}>
            {myGoals.map((g: any, i: number) => (
              <p key={i} className="text-xs" style={{ color: 'var(--acc)' }}>⚽ {g.playerName} {g.minuto}'</p>
            ))}
          </div>
        )}
        {rivalGoals.length > 0 && (
          <div className="mb-2 p-2 rounded-lg" style={{ background: 'rgba(255,71,87,0.08)' }}>
            {rivalGoals.map((g: any, i: number) => (
              <p key={i} className="text-xs" style={{ color: 'var(--dan)' }}>⚽ {g.playerName} {g.minuto}'</p>
            ))}
          </div>
        )}

        <StatRow label="Posesión" value={`${isL ? res.stats.posesionLocal : 100 - res.stats.posesionLocal}% - ${isL ? 100 - res.stats.posesionLocal : res.stats.posesionLocal}%`} />
        <StatRow label="Tiros" value={`${isL ? res.stats.tirosLocal : res.stats.tirosVisitante} - ${isL ? res.stats.tirosVisitante : res.stats.tirosLocal}`} last />

        {res.lesiones.length > 0 && res.lesiones.map((l: any, i: number) => (
          <div key={i} className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--dan)' }}>
            🚑 {l.playerName} — {l.tipo} — Baja {l.semanas}j
          </div>
        ))}
      </Card>

      {/* Rendimiento individual */}
      {myRatings.length > 0 && (
        <Card>
          <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setShowRatings(v => !v)}>
            <Bebas size={14} color="var(--tx2)">Rendimiento del equipo</Bebas>
            <span style={{ color: 'var(--tx2)', fontSize: 12 }}>{showRatings ? '▲' : '▼'}</span>
          </div>
          {showRatings && myRatings.map((r: any, i: number) => {
            const noteColor = r.nota >= 8 ? 'var(--acc)' : r.nota >= 6.5 ? 'var(--gol)' : r.nota >= 5 ? 'var(--tx2)' : 'var(--dan)';
            const tendIcon  = r.tendencia === 'up' ? '↑' : r.tendencia === 'down' ? '↓' : '→';
            const tendColor = r.tendencia === 'up' ? 'var(--acc)' : r.tendencia === 'down' ? 'var(--dan)' : 'var(--tx3)';
            return (
              <div key={r.playerId} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
                <p className="text-sm flex-1 truncate">{r.destacado ? '⭐ ' : ''}{r.playerName}</p>
                <div className="flex items-center gap-2">
                  <span style={{ color: tendColor, fontSize: 12, fontWeight: 700 }}>{tendIcon}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ background: `${noteColor}20`, color: noteColor }}>
                    {r.nota.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="text-xs mt-2 text-right" style={{ color: 'var(--tx3)' }}>
            Media: {myRatings.length ? (myRatings.reduce((s: number, r: any) => s + r.nota, 0) / myRatings.length).toFixed(1) : '—'}
          </p>
        </Card>
      )}
      {/* F5-1: Recomendaciones */}
      {(state?.recomendacionesPostPartido ?? []).length > 0 && (
        <Card>
          <Bebas size={14} color="var(--tx2)" className="mb-2">💡 Recomendaciones</Bebas>
          {(state?.recomendacionesPostPartido ?? []).map((r: any, i: number) => {
            const icons: Record<string, string> = { entrenar:'🏋️', rotar:'🔄', mantener:'✅', vigilar_conflicto:'⚠️', considerar_venta:'💰' };
            const colors: Record<string, string> = { entrenar:'var(--acc3)', rotar:'var(--gol)', mantener:'var(--acc)', vigilar_conflicto:'var(--acc2)', considerar_venta:'var(--dan)' };
            return (
              <div key={i} className="py-2 border-b" style={{ borderColor: 'var(--bor)' }}>
                <p className="text-sm font-semibold" style={{ color: colors[r.tipo] ?? 'var(--tex)' }}>
                  {icons[r.tipo]} {r.playerNombre}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{r.motivo}</p>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MERCADO TAB
// ─────────────────────────────────────────────────────────────

function MercadoTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, buyPlayer, sellPlayer, withdrawSale, intercambiar, renovarContrato, getExpiring, getWindow } = useGameStore();
  const club = useMyClub()!;
  const [tabIdx, setTabIdx]           = useState(0);
  const [pos, setPos]                 = useState('');
  const [buyTarget, setBuyTarget]     = useState<any>(null);
  const [oferta, setOferta]           = useState(0);
  const [loading, setLoading]         = useState(false);
  const [windowInfo, setWindowInfo]   = useState<any>(null);
  const [expiring, setExpiring]       = useState<any[]>([]);
  const [renewTarget, setRenewTarget] = useState<any>(null);
  const [renewSalario, setRenewSalario] = useState(0);
  const [renewAnios, setRenewAnios]   = useState(3);
  const [renewClausula, setRenewClausula] = useState(0);
  const [intercambioModal, setIntercambioModal] = useState(false);
  const [mySwapPlayer, setMySwapPlayer]   = useState<any>(null);
  const [rivSwapPlayer, setRivSwapPlayer] = useState<any>(null);
  const [swapDiff, setSwapDiff]           = useState(0);

  useEffect(() => {
    getWindow().then((w: any) => setWindowInfo(w)).catch(() => { setWindowInfo({ abierta: false, tipo: 'cerrada', mensaje: '🔒 Mercado cerrado' }); });
    getExpiring().then((e: any) => { if(Array.isArray(e)) setExpiring(e); }).catch(() => {});
  }, [state?.jornada]);

  const windowOpen = windowInfo?.abierta ?? true;
  const free    = (state?.mercadoLibre ?? []).filter((p: any) => !pos || p.pos === pos);
  const selling = club.plantilla.filter(p => p.enVenta);

  async function handleBuy() {
    if (!buyTarget) return;
    setLoading(true);
    try {
      const r = await buyPlayer(buyTarget.id, oferta);
      onToast(r.aceptado ? `✅ ${buyTarget.nombre} ${buyTarget.apellido} fichado` : (r.mensaje ?? '❌ Oferta rechazada — intenta con más dinero'));
      if (r.aceptado) setBuyTarget(null);
    } catch (e: any) { onToast(e.message, 'err'); }
    setLoading(false);
  }

  return (
    <div className="p-4">
      <Tabs tabs={['Disponibles','Mis ventas','Renovaciones']} active={tabIdx} onChange={setTabIdx} />

      {/* Window banner */}
      {windowInfo && (
        <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2"
          style={{ background: windowOpen ? 'rgba(0,229,160,0.1)' : 'rgba(255,71,87,0.1)', border: `1px solid ${windowOpen ? 'var(--acc)' : 'var(--dan)'}40` }}>
          <span className="text-lg">{windowOpen ? '🟢' : '🔴'}</span>
          <p className="text-sm font-semibold" style={{ color: windowOpen ? 'var(--acc)' : 'var(--dan)' }}>{windowInfo.mensaje}</p>
        </div>
      )}

      {tabIdx === 0 && (
        <>
          {windowOpen && (
            <Btn variant="secondary" small full className="mb-3" onClick={() => setIntercambioModal(true)}>
              🔀 Proponer Intercambio de Jugadores
            </Btn>
          )}
          <select value={pos} onChange={e => setPos(e.target.value)} className="mb-3" style={{ fontSize: 12 }}>
            <option value="">Todas posiciones</option>
            {['POR','DEF','MED','DEL'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {!windowOpen && <div className="rounded-xl p-3 mb-3 text-sm text-center" style={{ background: 'rgba(255,71,87,0.08)', color: 'var(--dan)' }}>🔒 Mercado cerrado — no puedes fichar ni vender</div>}
          <Card className="!p-0 overflow-hidden">
            {free.length === 0 && <Empty icon="🔍" text="Sin jugadores disponibles" />}
            {free.map((p: any, i: number) => (
              <div key={p.id}
                onClick={() => { if(!windowOpen) return; setBuyTarget(p); setOferta(p.valor); }}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < free.length - 1 ? '1px solid var(--bor)' : 'none', opacity: windowOpen ? 1 : 0.5, cursor: windowOpen ? 'pointer' : 'default' }}>
                <RatingBadge rating={p.media} />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{p.nombre} {p.apellido}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <PosBadge pos={p.pos} />
                    <span className="text-xs font-mono" style={{ color: 'var(--tx2)' }}>{p.edad}a · Pot:{p.potencial}</span>
                    <span className="text-xs px-1 rounded font-mono" style={{ background: p.nacionalidad === 'EX' ? 'rgba(255,107,53,0.15)' : 'rgba(136,153,187,0.15)', color: p.nacionalidad === 'EX' ? 'var(--acc2)' : 'var(--tx3)', fontSize: 9 }}>
                      {p.pais}{p.nacionalidad === 'EX' ? ' 🌍' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold" style={{ color: 'var(--acc)' }}>{fmtK(p.valor)}</p>
                  <p className="text-xs" style={{ color: 'var(--tx3)' }}>{fmtK(p.salario)}/sem</p>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {tabIdx === 1 && (
        <Card>
          {selling.length === 0 && <Empty icon="🏪" text="No tienes jugadores en venta" />}
          {selling.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: 'var(--bor)' }}>
              <RatingBadge rating={p.media} />
              <div className="flex-1"><p className="font-semibold text-sm">{p.nombre} {p.apellido}</p><PosBadge pos={p.pos} /></div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm" style={{ color: 'var(--acc)' }}>{fmtK(p.precioVenta || p.valor)}</p>
                <Btn small variant="danger" onClick={async () => { await withdrawSale(p.id); onToast('✅ Jugador retirado de la venta'); }}>✕</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tabIdx === 2 && (
        <>
          <p className="text-sm mb-3" style={{ color: 'var(--tx2)' }}>Contratos que expiran al final de esta temporada. Renuévalos antes de que se vayan libres.</p>
          {expiring.length === 0 && <Empty icon="📋" text="No hay contratos a punto de expirar" />}
          {expiring.map((p: any) => (
            <Card key={p.id}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <RatingBadge rating={p.media} />
                  <div>
                    <p className="font-semibold text-sm">{p.nombre} {p.apellido}</p>
                    <PosBadge pos={p.pos} />
                  </div>
                </div>
                <Tag color="red">Expira</Tag>
              </div>
              <StatRow label="Salario actual" value={fmtK(p.salario)} />
              <StatRow label="Pide mínimo" value={fmtK(p.salarioMinimo)} valueColor="var(--acc2)" last />
              <Btn small full className="mt-2" onClick={() => {
                setRenewTarget(p);
                setRenewSalario(p.salarioMinimo);
                setRenewAnios(3);
                setRenewClausula(p.clausulaSugerida);
              }}>📝 Negociar renovación</Btn>
            </Card>
          ))}
        </>
      )}

      {/* Renewal modal */}
      <BottomSheet open={!!renewTarget} onClose={() => setRenewTarget(null)} title="Negociar Renovación">
        {renewTarget && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <RatingBadge rating={renewTarget.media} size={48} />
              <div>
                <p className="font-bold">{renewTarget.nombre} {renewTarget.apellido}</p>
                <p className="text-sm" style={{ color: 'var(--tx2)' }}>{renewTarget.pos} · {renewTarget.edad}a</p>
              </div>
            </div>
            <Card>
              <StatRow label="Salario actual" value={fmtK(renewTarget.salario)} />
              <StatRow label="Salario mínimo" value={fmtK(renewTarget.salarioMinimo)} valueColor="var(--acc2)" last />
            </Card>
            {/* Salario — sin cero inicial, con botones +/- */}
            <label className="text-xs mb-1 block mt-2" style={{ color: 'var(--tx2)' }}>Salario ofrecido (€/sem)</label>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setRenewSalario(s => Math.max(0, s - 10000))}
                className="w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--dan)' }}>−</button>
              <div className="flex-1 text-center">
                <p className="font-bebas text-2xl" style={{ color: 'var(--acc)' }}>{renewSalario.toLocaleString('es-ES')} €</p>
                <input type="range" min={renewTarget.salario} max={renewTarget.salario * 3}
                  step={10000} value={renewSalario}
                  onChange={e => setRenewSalario(Number(e.target.value))}
                  className="w-full mt-1" style={{ accentColor: 'var(--acc)' }} />
              </div>
              <button onClick={() => setRenewSalario(s => s + 10000)}
                className="w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--acc)' }}>+</button>
            </div>

            <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Años de contrato</label>
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRenewAnios(n)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: renewAnios === n ? 'var(--acc)' : 'var(--sur2)', color: renewAnios === n ? '#000' : 'var(--tx2)', border: '1px solid var(--bor)' }}>
                  {n}a
                </button>
              ))}
            </div>

            {/* Cláusula — con botones +/- */}
            <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Cláusula de rescisión</label>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setRenewClausula(s => Math.max(0, s - 500000))}
                className="w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--dan)' }}>−</button>
              <p className="flex-1 text-center font-bebas text-xl" style={{ color: 'var(--acc)' }}>
                {renewClausula.toLocaleString('es-ES')} €
              </p>
              <button onClick={() => setRenewClausula(s => s + 500000)}
                className="w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--acc)' }}>+</button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--tx3)' }}>Bonus de firma: {(Math.round(renewTarget.salario * 4)).toLocaleString('es-ES')} €</p>
            <div className="flex gap-2">
              <Btn full loading={loading} onClick={async () => {
                setLoading(true);
                try {
                  const r: any = await renovarContrato(renewTarget.id, renewSalario, renewAnios, renewClausula);
                  if (r.aceptado) { onToast(`✅ ${renewTarget.nombre} ha renovado`); setRenewTarget(null); setExpiring(expiring.filter((p:any)=>p.id!==renewTarget.id)); }
                  else onToast(r.mensaje ?? 'Rechazó la oferta', 'err');
                } catch(e:any) { onToast(e.message,'err'); }
                setLoading(false);
              }}>Ofrecer renovación</Btn>
              <Btn full variant="secondary" onClick={() => setRenewTarget(null)}>Cancelar</Btn>
            </div>
          </>
        )}
      </BottomSheet>

      {/* F5-4: Intercambio modal */}
      <IntercambioModal open={intercambioModal} onClose={() => setIntercambioModal(false)} onToast={onToast} />

      {/* Buy modal */}
      <BottomSheet open={!!buyTarget} onClose={() => setBuyTarget(null)} title="Fichar Jugador">
        {buyTarget && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <RatingBadge rating={buyTarget.media} size={52} />
              <div><p className="font-bold text-base">{buyTarget.nombre} {buyTarget.apellido}</p><p className="text-sm" style={{ color: 'var(--tx2)' }}>{buyTarget.pos} · {buyTarget.edad}a · Pot:{buyTarget.potencial}</p></div>
            </div>
            <Card><StatRow label="Valor" value={fmtK(buyTarget.valor)} /><StatRow label="Salario/sem" value={fmtK(buyTarget.salario)} /><StatRow label="Presupuesto" value={fmtK(club.presupuesto)} valueColor="var(--acc)" last /></Card>
            <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Tu oferta</label>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setOferta(o => Math.max(0, o - 50000))}
                className="w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--dan)' }}>−</button>
              <p className="flex-1 text-center font-bebas text-2xl" style={{ color: 'var(--acc)' }}>
                {oferta.toLocaleString('es-ES')} €
              </p>
              <button onClick={() => setOferta(o => o + 50000)}
                className="w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: 'var(--acc)' }}>+</button>
            </div>
            <input type="range" min={0} max={Math.min(club.presupuesto, buyTarget.clausula)}
              step={50000} value={oferta}
              onChange={e => setOferta(Number(e.target.value))}
              className="w-full mb-3" style={{ accentColor: 'var(--acc)' }} />
            <div className="flex gap-2">
              <Btn full onClick={handleBuy} loading={loading}>💸 Ofertar</Btn>
              <Btn full variant="secondary" onClick={() => setBuyTarget(null)}>Cancelar</Btn>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLUB TAB
// ─────────────────────────────────────────────────────────────

function ClubTab({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, signSponsor, startWork, upgradeStaff } = useGameStore();
  const club = useMyClub()!;
  const jIdx   = (state?.jornada ?? 1) - 1;
  const fixture = state?.calendario?.[jIdx]?.find((f: any) => f.localId === state?.clubId || f.visitanteId === state?.clubId);
  const isHome  = fixture ? fixture.localId === state?.clubId : true;
  const [tabIdx, setTabIdx] = useState(0);
  const [loading, setLoading] = useState('');

  const SPONSORS = [
    { id:'local',    nombre:'Distribuciones García',  mult:0.7, repMin:0,  desc:'Local y seguro',     icon:'🏪' },
    { id:'regional', nombre:'Grupo Inversiones Norte', mult:1.0, repMin:30, desc:'Regional',           icon:'🏢' },
    { id:'nacional', nombre:'Telecom España',          mult:1.5, repMin:55, desc:'Nacional',           icon:'📡' },
    { id:'inter',    nombre:'SportMax International',  mult:2.2, repMin:75, desc:'Internacional',      icon:'🌍' },
    { id:'premier',  nombre:'GlobalBank Premium',      mult:3.5, repMin:90, desc:'Élite',              icon:'💎' },
  ];

  const WORKS = [
    { tipo:'aforo5',  icon:'📈', label:'+5.000 plazas',  coste:1500000,  jornadas:2,  ok: club.stadium.capacidad < 90000 },
    { tipo:'aforo15', icon:'🏟️', label:'+15.000 plazas', coste:4000000,  jornadas:5,  ok: club.stadium.capacidad + 15000 <= 90000 },
    { tipo:'aforo30', icon:'🏗️', label:'+30.000 plazas', coste:9000000,  jornadas:9,  ok: club.stadium.capacidad + 30000 <= 90000 },
    { tipo:'tienda',  icon:'🛍️', label:'Tienda',          coste:500000,   jornadas:2,  ok: !club.stadium.tienda },
    { tipo:'parking', icon:'🚗', label:'Parking',         coste:800000,   jornadas:2,  ok: !club.stadium.parking },
    { tipo:'inst',    icon:'⭐', label:'Instalaciones',   coste:1000000,  jornadas:3,  ok: club.stadium.instalaciones < 10 },
    { tipo:'bar',     icon:'🍺', label:'Mejorar bar',     coste:300000,   jornadas:1,  ok: true },
    { tipo:'vestuarios',icon:'🚿',label:'Vestuarios',     coste:700000,   jornadas:2,  ok: (club.stadium.vestuarios??1) < 5 },
  ];

  const salario  = club.plantilla.reduce((s, p) => s + p.salario, 0);
  const staffSal = club.staff.reduce((s, m) => s + m.salario, 0);
  const ingreso  = Math.round(club.stadium.capacidad * 0.65 * club.stadium.entradas_precio);
  const ingPat   = Math.round(club.patrocinio / (state?.calendario.length ?? 36));

  async function handleWork(tipo: string) {
    setLoading(tipo);
    try { await startWork(tipo); onToast('🏗️ Obra iniciada'); }
    catch (e: any) { onToast(e.message, 'err'); }
    setLoading('');
  }

  async function handleSponsor(id: string) {
    try { await signSponsor(id); onToast('🤝 Patrocinador firmado'); }
    catch (e: any) { onToast(e.message, 'err'); }
  }

  return (
    <div className="p-4">
      <Tabs tabs={['💰 Finanzas','🏟️ Estadio','👔 Staff']} active={tabIdx} onChange={setTabIdx} />

      {tabIdx === 0 && (
        <>
          <Card>
            <Bebas size={14} color="var(--tx2)" className="mb-2">Presupuesto</Bebas>
            <p className="font-bebas text-4xl" style={{ color: club.presupuesto >= 0 ? 'var(--acc)' : 'var(--dan)' }}>{fmtK(club.presupuesto)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--tx3)' }}>Inicial: {fmtK(club.presupuestoInicial)}</p>
          </Card>
          <Card>
            <Bebas size={13} color="var(--tx2)" className="mb-2">Ingresos/Jornada</Bebas>
            <StatRow label="🎟️ Entradas" value={fmtK(ingreso)} valueColor="var(--acc)" />
            <StatRow label="🤝 Patrocinio" value={fmtK(ingPat)} valueColor="var(--acc)" />
            {club.stadium.tienda  && <StatRow label="🛍️ Tienda"  value={fmtK(Math.round(club.stadium.capacidad * 0.15 * 8))} valueColor="var(--acc)" />}
            {club.stadium.parking && <StatRow label="🚗 Parking" value={fmtK(Math.round(club.stadium.capacidad * 0.2 * 5))} valueColor="var(--acc)" />}
            {club.stadium.bar     && <StatRow label="🍺 Bar"     value={fmtK(Math.round(club.stadium.capacidad * 0.4 * club.stadium.bar_precio))} valueColor="var(--acc)" last />}
          </Card>
          <Card>
            <Bebas size={13} color="var(--tx2)" className="mb-2">Gastos/Jornada</Bebas>
            <StatRow label="💼 Salarios plantilla" value={fmtK(salario)} valueColor="var(--dan)" />
            <StatRow label="👔 Salarios staff"     value={fmtK(staffSal)} valueColor="var(--dan)" last />
          </Card>
          {/* Sponsor */}
          <Card>
            <Bebas size={13} color="var(--tx2)" className="mb-2">🤝 Patrocinador</Bebas>
            {state?.patrocinadorFirmado ? (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--sur2)' }}>
                🔒 Contrato firmado hasta final de temporada<br />
                <span className="font-mono" style={{ color: 'var(--acc)' }}>{fmtK(club.patrocinio)}/año</span>
              </div>
            ) : (
              SPONSORS.filter(s => club.rep >= s.repMin).map(s => (
                <div key={s.id} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--bor)' }}>
                  <div><p className="font-semibold text-sm">{s.icon} {s.nombre}</p><p className="text-xs" style={{ color: 'var(--acc)' }}>{fmtK(Math.round(club.patrocinioBase * s.mult))}/año</p></div>
                  <Btn small onClick={() => handleSponsor(s.id)}>Firmar</Btn>
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {tabIdx === 1 && (
        <>
          <Card>
            <Bebas size={14} color="var(--tx2)" className="mb-2">{club.stadium.nombre}</Bebas>
            <StatRow label="Capacidad" value={`${club.stadium.capacidad.toLocaleString()} / 90.000`} />
            <StatRow label="Instalaciones" value={`${club.stadium.instalaciones}/10`} />
            <Progress value={club.stadium.instalaciones * 10} color="var(--acc3)" className="mb-2" />
            <StatRow label="Tienda"  value={club.stadium.tienda  ? '✅' : '❌'} />
            <StatRow label="Bar"     value={club.stadium.bar     ? '✅' : '❌'} />
            <StatRow label="Parking" value={club.stadium.parking ? '✅' : '❌'} last />
          </Card>

          {/* Ongoing works */}
          {club.obras.length > 0 && (
            <Card>
              <Bebas size={13} color="var(--acc2)" className="mb-2">En Construcción</Bebas>
              {club.obras.map(w => (
                <div key={w.id} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--bor)' }}>
                  <p className="text-sm">🏗️ {w.label}</p>
                  <Tag color="gold">{w.jornadasRestantes}j</Tag>
                </div>
              ))}
            </Card>
          )}

          <Card>
            <Bebas size={13} color="var(--tx2)" className="mb-2">Mejoras Disponibles</Bebas>
            {WORKS.filter(w => w.ok && !club.obras.some(o => o.tipo === w.tipo)).map(w => (
              <div key={w.tipo} className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--bor)' }}>
                <div>
                  <p className="text-sm font-semibold">{w.icon} {w.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx3)' }}>{fmtK(w.coste)} · {w.jornadas} jornada{w.jornadas !== 1 ? 's' : ''}</p>
                </div>
                <Btn small loading={loading === w.tipo} variant={club.presupuesto >= w.coste ? 'primary' : 'secondary'} onClick={() => handleWork(w.tipo)}>
                  {club.presupuesto >= w.coste ? 'Iniciar' : 'Sin fondos'}
                </Btn>
              </div>
            ))}
            {club.stadium.capacidad >= 90000 && <p className="text-sm text-center py-3" style={{ color: 'var(--acc)' }}>🏆 Aforo máximo alcanzado</p>}
          </Card>

          {/* Ticket price */}
          <PriceControls club={club} onToast={onToast} isHome={isHome} />
        </>
      )}

      {tabIdx === 2 && (
        <Card>
          {club.staff.map((s, i) => {
            const xpCoste  = s.nivel * 300;
            const dinCoste = s.nivel * 200000;
            const canUpgrade = s.nivel < 10 && state!.xpManager >= xpCoste && club.presupuesto >= dinCoste;
            return (
            <div key={s.id} className="py-3 border-b" style={{ borderColor: 'var(--bor)' }}>
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-sm">{s.nombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{s.rol.charAt(0).toUpperCase()+s.rol.slice(1)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tx3)' }}>{fmtK(s.salario)}/sem · {s.contrato}a</p>
                </div>
                <div className="text-right">
                  <div className="font-bebas text-2xl" style={{ color: 'var(--acc)' }}>{s.nivel}<span className="text-sm" style={{ color: 'var(--tx3)' }}>/10</span></div>
                  {s.nivel < 10 && (
                    <button
                      disabled={!canUpgrade}
                      onClick={async () => {
                        try { await upgradeStaff(s.id); onToast(`⬆️ ${s.nombre} subió a nivel ${s.nivel+1}`); }
                        catch(e:any) { onToast(e.message,'err'); }
                      }}
                      className="text-xs px-2 py-1 rounded-lg mt-1"
                      style={{ background: canUpgrade ? 'var(--acc)20' : 'var(--sur2)', color: canUpgrade ? 'var(--acc)' : 'var(--tx3)', border: `1px solid ${canUpgrade ? 'var(--acc)40' : 'var(--bor)'}` }}>
                      ⬆️ {xpCoste}XP·{fmtK(dinCoste)}
                    </button>
                  )}
                </div>
              </div>
              <Progress value={s.nivel * 10} color="var(--gol)" className="mt-1" />
            </div>
            );
          })}
          ))}
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIGA TAB
// ─────────────────────────────────────────────────────────────

function LigaTab() {
  const { state } = useGameStore();
  const club      = useMyClub()!;
  const standings = useStandings();

  const topScorers = state?.liga
    .filter(c => c.div === club.div)
    .flatMap(c => c.plantilla)
    .filter(p => p.goles > 0)
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 5) ?? [];

  const myResults = (state?.resultados ?? [])
    .filter(r => r.localId === state?.clubId || r.visitanteId === state?.clubId)
    .slice(-5)
    .reverse();

  return (
    <div className="p-4">
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">
          Clasificación · J{Math.max(0,(state?.jornada??1)-1)}/{state?.calendario.length}
        </Bebas>
        {standings.map((c, i) => {
          const me = c.id === state?.clubId;
          const posColor = i < 4 ? 'var(--acc)' : i >= standings.length - 4 ? 'var(--dan)' : 'var(--tx2)';
          return (
            <div key={c.id} className="flex items-center gap-2 py-2 border-b rounded-lg px-1"
              style={{ borderColor: 'var(--bor)', background: me ? 'var(--sur2)' : 'transparent' }}>
              <span className="w-5 text-xs font-mono font-bold text-right" style={{ color: posColor }}>{i+1}</span>
              <span className="text-lg">{c.escudo}</span>
              <span className="flex-1 text-sm font-semibold truncate" style={{ color: me ? 'var(--acc)' : 'var(--tex)' }}>
                {c.nombre}{me ? ' 👤' : ''}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--tx3)' }}>{c.pj} {c.pg}-{c.pe}-{c.pp}</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--acc)', minWidth: 24, textAlign: 'right' }}>{c.pts}</span>
            </div>
          );
        })}
        <div className="flex gap-4 mt-2 text-xs"><span style={{ color: 'var(--acc)' }}>▮ Champions/Ascenso</span><span style={{ color: 'var(--dan)' }}>▮ Descenso</span></div>
      </Card>

      {topScorers.length > 0 && (
        <Card>
          <Bebas size={14} color="var(--tx2)" className="mb-2">🥇 Goleadores</Bebas>
          {topScorers.map((p, i) => <StatRow key={p.id} label={`${i+1}. ${p.nombre} ${p.apellido}`} value={`${p.goles} ⚽`} last={i === topScorers.length-1} />)}
        </Card>
      )}

      {/* F5-2: Historial completo navegable */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">📋 Historial de Resultados</Bebas>
        {(state?.historialResultados ?? []).length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: 'var(--tx3)' }}>Sin resultados aún</p>
        )}
        {[...(state?.historialResultados ?? [])].reverse().map((r: any, i: number) => {
          const isL   = r.localId === state?.clubId;
          const myG   = isL ? r.golesLocal : r.golesVisitante;
          const rivG  = isL ? r.golesVisitante : r.golesLocal;
          const rival = state?.liga.find((c: any) => c.id === (isL ? r.visitanteId : r.localId));
          const color = myG > rivG ? 'var(--acc)' : myG === rivG ? 'var(--gol)' : 'var(--dan)';
          const myGoles = (r.goles ?? []).filter((g: any) => isL ? g.equipo === 'local' : g.equipo === 'visitante');
          return (
            <div key={i} className="py-2.5 border-b" style={{ borderColor: 'var(--bor)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono" style={{ color: 'var(--tx3)' }}>J{r.jornada} {isL ? '🏠' : '✈️'} </span>
                  <span className="text-sm font-semibold">{rival?.nombre ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold" style={{ color: 'var(--tex)' }}>{myG}-{rivG}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ background: `${color}20`, color }}>
                    {myG > rivG ? 'V' : myG === rivG ? 'E' : 'D'}
                  </span>
                </div>
              </div>
              {myGoles.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--acc)' }}>
                  ⚽ {myGoles.map((g: any) => `${g.playerName.split(' ')[0]} ${g.minuto}'`).join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MINI-COMPONENTS
// ─────────────────────────────────────────────────────────────

function EventsBanner({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, resolveEvent } = useGameStore();
  const [open, setOpen] = useState(false);
  const ev = state?.eventosActivos.find(e => !e.resuelto);
  if (!ev) return null;
  return (
    <>
      <div onClick={() => setOpen(true)} className="rounded-xl p-3 cursor-pointer" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--gol)' }}>🔔 {ev.titulo}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{ev.descripcion.slice(0, 80)}...</p>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={ev.titulo}>
        <p className="text-sm mb-4" style={{ color: 'var(--tx2)' }}>{ev.descripcion}</p>
        <div className="flex flex-col gap-2">
          {ev.opciones.map(op => (
            <button key={op.id} onClick={async () => {
              await resolveEvent(ev.id, op.id);
              onToast('✅ Decisión tomada');
              setOpen(false);
            }} className="p-3 rounded-xl text-left border" style={{ background: 'var(--sur2)', borderColor: 'var(--bor)' }}>
              <p className="font-semibold text-sm">{op.texto}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>{op.efecto}</p>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

function TrivialBanner({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { getTrivial, submitTrivial } = useGameStore();
  const [open, setOpen]       = useState(false);
  const [qs, setQs]           = useState<any[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone]       = useState(false);
  const [xp, setXp]           = useState(0);

  async function load() {
    try {
      const data: any = await getTrivial();
      setQs(data.preguntas); setAnswers(new Array(data.preguntas.length).fill(-1));
      setDone(false); setOpen(true);
    } catch (e: any) { onToast(e.message, 'err'); }
  }

  async function submit() {
    try {
      const r = await submitTrivial(qs.map((q:any)=>q.id), answers);
      setXp(r.xpGanado); setDone(true);
      onToast(`🧠 +${r.xpGanado} XP`);
    } catch (e: any) { onToast(e.message, 'err'); }
  }

  return (
    <>
      <div onClick={load} className="rounded-xl p-3 cursor-pointer" style={{ background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--acc3)' }}>🧠 Trivial de la Jornada</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>5 preguntas · Gana XP</p>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Trivial Fútbol">
        {done ? (
          <div className="text-center py-6">
            <p className="text-4xl mb-2">🧠</p>
            <p className="font-bebas text-2xl" style={{ color: 'var(--acc)' }}>+{xp} XP ganados</p>
            <Btn full className="mt-4" onClick={() => setOpen(false)}>Cerrar</Btn>
          </div>
        ) : (
          <>
            {qs.map((q: any, qi: number) => (
              <div key={q.id} className="mb-4">
                <p className="text-sm font-semibold mb-2">{qi + 1}. {q.pregunta}</p>
                <div className="flex flex-col gap-1.5">
                  {q.opciones.map((op: string, oi: number) => (
                    <button key={oi} onClick={() => { const a = [...answers]; a[qi] = oi; setAnswers(a); }}
                      className="text-left px-3 py-2 rounded-lg text-sm border transition-all"
                      style={{ borderColor: answers[qi] === oi ? 'var(--acc)' : 'var(--bor)', background: answers[qi] === oi ? 'var(--acc)15' : 'var(--sur2)', color: answers[qi] === oi ? 'var(--acc)' : 'var(--tex)' }}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Btn full onClick={submit} disabled={answers.includes(-1)}>Enviar respuestas</Btn>
          </>
        )}
      </BottomSheet>
    </>
  );
}

function LootBanner({ onToast }: { onToast: (m: string, t?: 'ok'|'err') => void }) {
  const { state, openLootBox } = useGameStore();
  const boxes = state?.lootBoxes.filter(b => !b.contenido) ?? [];
  if (boxes.length === 0) return null;
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--gol)' }}>📦 Loot Boxes sin abrir ({boxes.length})</p>
      <div className="flex gap-2 mt-2 flex-wrap">
        {boxes.map(b => (
          <Btn key={b.id} small variant="gold" onClick={async () => {
            try { const r: any = await openLootBox(b.id); onToast(`🌟 ${r.player.nombre} ${r.player.apellido} — Media ${r.player.media}`); }
            catch (e: any) { onToast(e.message, 'err'); }
          }}>Abrir {b.tier}</Btn>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// NEWS FEED & SCOUTING
// ─────────────────────────────────────────────────────────────

function NewsFeed() {
  const { getNews } = useGameStore();
  const [news, setNews] = useState<any>(null);

  useEffect(() => {
    getNews().then((n: any) => setNews(n)).catch(() => {});
  }, []);

  const items = [...(news?.fichas ?? []).map((f: any) => ({ ...f, tipo: 'ficha' })), ...(news?.bajas ?? []).map((b: any) => ({ ...b, tipo: 'baja' }))].slice(0, 6);
  const scouting = news?.scouting?.slice(0, 3) ?? [];

  if (items.length === 0 && scouting.length === 0) return null;

  return (
    <Card>
      <Bebas size={14} color="var(--tx2)" className="mb-2">📰 Noticias de la Liga</Bebas>
      {items.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
          <span>{item.tipo === 'ficha' ? '📥' : '📤'}</span>
          <p className="text-xs flex-1" style={{ color: 'var(--tx2)' }}>
            <b style={{ color: 'var(--tex)' }}>{item.playerNombre}</b> {item.tipo === 'ficha' ? 'ficha por' : 'sale de'} {item.clubNombre} · {fmtK(item.precio)}
          </p>
        </div>
      ))}
      {scouting.length > 0 && (
        <>
          <p className="text-xs font-bold mt-2 mb-1" style={{ color: 'var(--acc3)' }}>🔭 Informes de scouting</p>
          {scouting.map((r: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--bor)' }}>
              <div>
                <p className="text-xs font-semibold">{r.playerNombre}</p>
                <p className="text-xs" style={{ color: 'var(--tx2)' }}>Media ~{r.mediaEstimada} · Pot ~{r.potencialEstimado}</p>
              </div>
              <Tag color={r.recomendacion === 'fichar' ? 'green' : r.recomendacion === 'seguir' ? 'gold' : 'red'}>
                {r.recomendacion === 'fichar' ? '✅ Fichar' : r.recomendacion === 'seguir' ? '👀 Seguir' : '❌ No'}
              </Tag>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// PRICE CONTROLS — tickets, bar, shop
// ─────────────────────────────────────────────────────────────

function PriceControls({ club, onToast, isHome }: { club: any; onToast: (m: string, t?: 'ok'|'err') => void; isHome: boolean }) {
  const { state, saveGame } = useGameStore();

  if (!isHome) {
    return (
      <Card>
        <p className="text-sm text-center py-4" style={{ color: 'var(--tx3)' }}>
          ✈️ Juegas fuera — los ingresos de estadio los gestiona el club local
        </p>
      </Card>
    );
  }

  async function updatePrice(field: string, delta: number) {
    if (!state) return;
    const myClub = state.liga.find((c: any) => c.id === state.clubId);
    if (!myClub) return;

    if (field === 'entradas') {
      myClub.stadium.entradas_precio = Math.max(5, Math.min(200, myClub.stadium.entradas_precio + delta));
    } else if (field === 'bar') {
      myClub.stadium.bar_precio = Math.max(1, Math.min(15, myClub.stadium.bar_precio + delta));
    }
    await saveGame();
    onToast(`✅ Precio actualizado`);
  }

  const ocupMed = Math.round(club.stadium.capacidad * 0.65);
  const ingrBar = Math.round(ocupMed * 0.4 * club.stadium.bar_precio);

  return (
    <>
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-3">🎟️ Precio de Entradas</Bebas>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bebas text-3xl" style={{ color: 'var(--acc)' }}>{club.stadium.entradas_precio}€</p>
            <p className="text-xs" style={{ color: 'var(--tx3)' }}>
              ~{fmtK(Math.round(ocupMed * club.stadium.entradas_precio))} por partido local
            </p>
          </div>
          <div className="flex gap-1">
            {[-5, -1, 1, 5].map(d => (
              <button key={d} onClick={() => updatePrice('entradas', d)}
                className="w-9 h-9 rounded-lg text-sm font-bold"
                style={{ background: d > 0 ? 'var(--sur2)' : 'var(--sur2)', border: '1px solid var(--bor)', color: d > 0 ? 'var(--acc)' : 'var(--dan)' }}>
                {d > 0 ? '+' : ''}{d}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--tx3)' }}>
          💡 Precio alto = más ingresos pero menos asistencia. Precio bajo = estadio lleno pero menos €.
        </p>
      </Card>

      {club.stadium.bar && (
        <Card>
          <Bebas size={13} color="var(--tx2)" className="mb-3">🍺 Precio del Bar</Bebas>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bebas text-3xl" style={{ color: 'var(--acc)' }}>{club.stadium.bar_precio}€</p>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>
                ~{fmtK(ingrBar)} por partido local
              </p>
            </div>
            <div className="flex gap-1">
              {[-1, 1].map(d => (
                <button key={d} onClick={() => updatePrice('bar', d)}
                  className="w-9 h-9 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--sur2)', border: '1px solid var(--bor)', color: d > 0 ? 'var(--acc)' : 'var(--dan)' }}>
                  {d > 0 ? '+' : ''}{d}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--tx3)' }}>
            💡 Bar caro reduce satisfacción del aficionado. Precio óptimo: 3-6€.
          </p>
        </Card>
      )}

      {club.stadium.tienda && (
        <Card>
          <Bebas size={13} color="var(--tx2)" className="mb-2">🛍️ Tienda de Merchandising</Bebas>
          <StatRow label="Multiplicador" value={`×${club.stadium.tienda_revenue_mult.toFixed(1)}`} valueColor="var(--acc)" />
          <StatRow label="Ingreso/partido" value={fmtK(Math.round(ocupMed * 0.15 * 8 * club.stadium.tienda_revenue_mult))} last />
          <p className="text-xs mt-2" style={{ color: 'var(--tx3)' }}>
            💡 Mejora las instalaciones para aumentar el multiplicador de la tienda automáticamente.
          </p>
        </Card>
      )}
    </>
  );
}
