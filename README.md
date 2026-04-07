# FOOTIX — Tu Club, Tus Reglas

> Manager de fútbol estilo PC Fútbol. PWA instalable en iOS y Android.

## Setup rápido

```bash
unzip futbolmanager-v2.zip && cd futbolmanager-v2
bash instalar.sh   # instala todo
./arrancar.sh      # arranca backend + frontend
# Abre http://localhost:5173
```

**Requisito:** Node.js 18+ — https://nodejs.org

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + Zustand (PWA) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | Prisma + SQLite |
| Tiempo real | Socket.io |

## Endpoints principales

### /api/game
- POST /:slot/new — nueva partida
- GET /:slot — cargar partida
- POST /:slot/lineup — guardar alineación
- POST /:slot/sponsor — firmar patrocinador
- POST /:slot/iniciarliga — iniciar liga
- POST /:slot/upgrade — mejorar jugador (XP + dinero)
- POST /:slot/staffupgrade — subir nivel staff

### /api/match
- POST /:slot/simulate — simular jornada
- POST /:slot/scout — scouting activo (50 XP)
- GET /:slot/scouting/targets — scouts activos

### /api/market
- POST /:slot/buy — fichar jugador
- POST /:slot/sell — poner en venta
- POST /:slot/cesion — ceder jugador
- POST /:slot/intercambio — intercambio con diferencia
- POST /:slot/renovar — renovar contrato
- POST /training/:slot/session — entrenar (1/jornada)
- POST /events/:slot/:id/resolve — resolver evento
- POST /trivial/:slot/submit — enviar trivial
- POST /loot/:slot/buy — comprar loot box

## Calibración de balance (v2.7)

| Club | División | Superávit esperado/temporada |
|------|---------|----------------------------|
| Grande | D1 | ±5M € |
| Medio | D1 | -2M a +5M € |
| Pequeño | D1 | -5M a 0M € |
| Medio | D2 | ±2M € |
| Pequeño | D3 | -500K a +500K € |

## Checklist de validación

- [ ] Marcador live coincide con resultado final (local/visitante correcto)
- [ ] Resultado rápido muestra ratings y tendencias
- [ ] Precio entradas alto reduce asistencia
- [ ] 8 jornadas en déficit bloquea fichajes
- [ ] Ascenso/descenso reescala presupuesto y objetivo
- [ ] IA respeta máx 3 extracomunitarios
- [ ] Promesa de minutos: penalización si no cumples en 5 jornadas
- [ ] Scouting activo genera informe en N jornadas
- [ ] Upgrade media jugador 80+ cuesta ×3 vs media 65

## Changelog

### v2.7
- Salarios calibrados por división (D1 x2.5, D2 x1.6)
- Upgrade de media escala con media actual del jugador
- IA activa al 45% de jornadas, valida wage cap
- Alineación visual táctica para móvil con validación de EX

### v2.6
- Convocatorias solo en parón (J8-14, J22-28)
- Promesa de minutos con seguimiento y penalización
- Historial de carrera multitemporada
- Panel QA debug interno

### v2.5
- Recomendaciones post-partido automáticas
- Historial de resultados + transferencias
- UI intercambio 4 pasos
- Scouting activo con objetivo
- Solicitud formal de salida

### v2.4
- Reescalado económico al cambiar división
- XP jugadores CPU por participación real
- Convocatoria con ausencia real
- Déficit crónico progresivo
- ErrorBoundary global
