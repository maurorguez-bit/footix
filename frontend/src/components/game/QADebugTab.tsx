import { useGameStore, useMyClub } from '@/stores/gameStore';
import { Bebas, Card, StatRow, Tag, fmtK, Empty } from '@/components/ui';

/**
 * F6-6: Pantalla interna de validación y debug
 * Solo visible en desarrollo o con flag especial.
 * Muestra el estado interno del juego para QA manual.
 */
export function QADebugTab() {
  const { state } = useGameStore();
  const club = useMyClub();

  if (!state || !club) return null;

  const convocados   = club.plantilla.filter(p => p.convocado);
  const lesionados   = club.plantilla.filter(p => p.lesionado);
  const conflictos   = club.plantilla.filter(p => p.emocion === 'enfadado' || p.emocion === 'conflicto');
  const enVenta      = club.plantilla.filter(p => p.enVenta);
  const eventosVivos = state.eventosActivos.filter(e => !e.resuelto);

  const divNames = ['División 1', 'División 2', 'División 3'];
  const fmtBool  = (v: boolean | undefined) => v ? '✅ Sí' : '❌ No';
  const fmtColor = (v: boolean | undefined) => v ? 'var(--acc)' : 'var(--dan)';

  return (
    <div className="p-4">
      <Bebas size={20} className="mb-1">🔧 Panel de QA</Bebas>
      <p className="text-xs mb-4" style={{ color: 'var(--tx3)' }}>
        Uso interno — muestra el estado real del juego para validación manual
      </p>

      {/* Estado económico */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">💰 Estado Económico</Bebas>
        <StatRow label="Presupuesto"        value={fmtK(club.presupuesto)}
          valueColor={club.presupuesto >= 0 ? 'var(--acc)' : 'var(--dan)'} />
        <StatRow label="Presupuesto inicio" value={fmtK(state.presupuestoInicioTemporada ?? 0)} />
        <StatRow label="Jornadas en déficit" value={state.jornadasEnDeficit ?? 0}
          valueColor={(state.jornadasEnDeficit ?? 0) > 0 ? 'var(--acc2)' : 'var(--acc)'} />
        <StatRow label="Bloqueado por deuda"  value={fmtBool(state.bloqueadoPorDeuda)}    valueColor={fmtColor(!state.bloqueadoPorDeuda)} />
        <StatRow label="Advertencia directiva" value={fmtBool(state.advertenciaDirectiva)} valueColor={fmtColor(!state.advertenciaDirectiva)} />
        <StatRow label="Patrocinio firmado"    value={fmtBool(state.patrocinadorFirmado)}  valueColor={fmtColor(state.patrocinadorFirmado)} last />
      </Card>

      {/* Flags de temporada */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">📋 Flags de Temporada</Bebas>
        <StatRow label="Fase"              value={state.fase} />
        <StatRow label="Jornada"          value={`${state.jornada} / ${state.calendario?.length ?? '?'}`} />
        <StatRow label="División"         value={divNames[club.div] ?? '?'} />
        <StatRow label="Temp. terminada"  value={fmtBool(state.temporadaTerminada)} valueColor={fmtColor(!state.temporadaTerminada)} />
        <StatRow label="Último entreno J" value={state.ultimoEntrenamientoJornada ?? 'Nunca'} last />
      </Card>

      {/* XP y reputación */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">⚡ Progresión</Bebas>
        <StatRow label="XP Manager"         value={state.xpManager} valueColor="var(--gol)" />
        <StatRow label="Experiencia Manager" value={state.experienciaManager} />
        <StatRow label="Rep Manager"        value={`${state.repManager}/100`} />
        <StatRow label="Loot boxes sin abrir" value={state.lootBoxes?.filter(b => !b.contenido).length ?? 0} last />
      </Card>

      {/* Plantilla — estados críticos */}
      <Card>
        <Bebas size={14} color="var(--tx2)" className="mb-2">👥 Plantilla — Estados</Bebas>
        <StatRow label="Total jugadores"  value={club.plantilla.length} />
        <StatRow label="Lesionados"       value={lesionados.length}  valueColor={lesionados.length > 0 ? 'var(--dan)' : 'var(--acc)'} />
        <StatRow label="Convocados int."  value={convocados.length}  valueColor={convocados.length > 0 ? 'var(--acc3)' : 'var(--tx2)'} />
        <StatRow label="En conflicto"     value={conflictos.length}  valueColor={conflictos.length > 0 ? 'var(--dan)' : 'var(--acc)'} />
        <StatRow label="En venta"         value={enVenta.length}     last />
      </Card>

      {/* Convocados detalle */}
      {convocados.length > 0 && (
        <Card>
          <Bebas size={13} color="var(--tx2)" className="mb-2">🌍 Convocados</Bebas>
          {convocados.map(p => (
            <StatRow key={p.id}
              label={`${p.nombre} ${p.apellido}`}
              value={`${p.convocadoJornadas}j restantes`}
              valueColor="var(--acc3)" />
          ))}
        </Card>
      )}

      {/* Conflictos detalle */}
      {conflictos.length > 0 && (
        <Card>
          <Bebas size={13} color="var(--tx2)" className="mb-2">⚠️ Conflictos Activos</Bebas>
          {conflictos.map(p => (
            <div key={p.id} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
              <p className="text-sm">{p.nombre} {p.apellido}</p>
              <div className="flex gap-1.5">
                <Tag color={p.emocion === 'conflicto' ? 'red' : 'gold'}>{p.emocion}</Tag>
                <span className="text-xs font-mono" style={{ color: 'var(--tx3)' }}>moral {p.moral}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Promesas de minutos */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">⏱ Promesas de Minutos</Bebas>
        {(state.promesasMinutos ?? []).length === 0
          ? <p className="text-xs" style={{ color: 'var(--tx3)' }}>Sin promesas activas</p>
          : (state.promesasMinutos ?? []).map(pm => (
            <div key={pm.playerId} className="py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
              <div className="flex justify-between">
                <p className="text-sm">{pm.playerNombre}</p>
                <p className="text-xs font-mono" style={{ color: pm.partidosJugados >= pm.minPartidos ? 'var(--acc)' : 'var(--gol)' }}>
                  {pm.partidosJugados}/{pm.minPartidos} partidos
                </p>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tx3)' }}>
                Límite: J{pm.jornadaLimite} · Quedan {pm.jornadaLimite - state.jornada} jornadas
              </p>
            </div>
          ))
        }
      </Card>

      {/* Scouting activo */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">🔭 Scouts Activos</Bebas>
        {(state.scoutRequests ?? []).length === 0
          ? <p className="text-xs" style={{ color: 'var(--tx3)' }}>Sin seguimientos activos</p>
          : (state.scoutRequests ?? []).map((r: any) => (
            <div key={r.id} className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
              <p className="text-sm">{r.targetNombre}</p>
              <Tag color="blue">{r.jornadasRestantes}j</Tag>
            </div>
          ))
        }
      </Card>

      {/* Eventos activos */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">📢 Eventos Sin Resolver</Bebas>
        {eventosVivos.length === 0
          ? <p className="text-xs" style={{ color: 'var(--tx3)' }}>Sin eventos pendientes</p>
          : eventosVivos.map(ev => (
            <div key={ev.id} className="py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
              <p className="text-sm font-semibold">{ev.titulo}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tx3)' }}>Tipo: {ev.tipo} · J{ev.jornada}</p>
            </div>
          ))
        }
      </Card>

      {/* Últimas recomendaciones */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">💡 Últimas Recomendaciones</Bebas>
        {(state.recomendacionesPostPartido ?? []).length === 0
          ? <p className="text-xs" style={{ color: 'var(--tx3)' }}>Sin recomendaciones (juega un partido)</p>
          : (state.recomendacionesPostPartido ?? []).map((r: any, i: number) => (
            <div key={i} className="py-1.5 border-b" style={{ borderColor: 'var(--bor)' }}>
              <p className="text-sm font-semibold">{r.playerNombre}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tx2)' }}>
                [{r.tipo}] {r.motivo}
              </p>
            </div>
          ))
        }
      </Card>

      {/* Calendario sanity check */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">🗓 Calendario</Bebas>
        <StatRow label="Total jornadas"   value={state.calendario?.length ?? 0} />
        <StatRow label="Jornadas jugadas" value={state.historialResultados?.length ?? 0} />
        <StatRow label="Jornada invierno" value={state.jornadaInvierno ?? '?'} />
        <StatRow label="Jornada mercado"  value={state.jornadaMercadoAbre ?? '?'} last />
      </Card>

      {/* Estado económico calculado en tiempo real */}
      <Card>
        <Bebas size={13} color="var(--tx2)" className="mb-2">📊 Cálculo de ingresos/jornada (estimado)</Bebas>
        {(() => {
          const cap     = club.stadium.capacidad;
          const rep     = club.rep;
          const precio  = club.stadium.entradas_precio;
          const precioOpt = 20 + rep * 0.5;
          const mult    = Math.max(0.5, Math.min(1.2, precioOpt / Math.max(1, precio)));
          const ocup    = Math.min(1, (0.5 + rep / 200) * mult);
          const asist   = Math.round(cap * ocup);
          const ingPartido = asist * precio;
          const ingPat  = Math.round((club.patrocinio ?? 0) / 38);
          const gastos  = club.plantilla.reduce((s: number, p: any) => s + (p.salario || 0), 0) +
                          club.staff.reduce((s: number, st: any) => s + (st.salario || 0), 0);
          const balance = ingPartido / 2 + ingPat - gastos;
          return (
            <>
              <StatRow label="Aforo / ocupación"   value={`${asist.toLocaleString()} / ${Math.round(ocup*100)}%`} />
              <StatRow label="Precio multiplicador" value={`×${mult.toFixed(2)}`} valueColor={mult < 0.8 ? 'var(--dan)' : 'var(--acc)'} />
              <StatRow label="Ingreso partido (home)" value={`+${Math.round(ingPartido/1000)}K€`} />
              <StatRow label="Patrocinio/jornada"   value={`+${Math.round(ingPat/1000)}K€`} />
              <StatRow label="Salarios/jornada"     value={`-${Math.round(gastos/1000)}K€`} valueColor="var(--dan)" />
              <StatRow label="Balance neto/jornada" last
                value={`${balance >= 0 ? '+' : ''}${Math.round(balance/1000)}K€`}
                valueColor={balance >= 0 ? 'var(--acc)' : 'var(--dan)'} />
            </>
          );
        })()}
      </Card>

      <p className="text-center text-xs mt-4 mb-2" style={{ color: 'var(--tx3)' }}>
        Panel QA — no afecta el juego. Ver logs del backend en consola del servidor.
      </p>
    </div>
  );
}
