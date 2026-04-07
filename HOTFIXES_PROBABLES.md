# FOOTIX — Hotfixes probables post-playtest

Lista priorizada de lo que más probablemente hay que arreglar
después de la primera tanda de testers reales.

---

## P0 — Bloquean el juego (arreglar en <1h)

### HF-01: Keep-alive para Railway free tier
**Síntoma:** Testers reportan "sin conexión" recurrente.  
**Fix:** Añadir endpoint de ping y llamarlo cada 25 minutos desde el frontend.
```ts
// En App.tsx, useEffect raíz:
setInterval(() => fetch('/api/health').catch(() => {}), 25 * 60 * 1000);
```
**Archivo:** `frontend/src/App.tsx`  
**Riesgo:** Ninguno.

### HF-02: Error CORS inesperado en producción
**Síntoma:** Console del navegador muestra "CORS policy" y las llamadas API fallan.  
**Fix:** Verificar que `CLIENT_URL` en Railway coincide EXACTAMENTE con la URL de Vercel (con https://, sin / final).  
**Archivo:** Railway → Variables → `CLIENT_URL`  
**Riesgo:** Ninguno.

### HF-03: Partida no carga tras reinicio de Railway
**Síntoma:** Login funciona pero la partida aparece como nueva.  
**Causa:** `migrate deploy` falló silenciosamente o las tablas se recrearon.  
**Fix:** Verificar Railway → PostgreSQL → Tables que existen User y GameSave con datos.  
**Si las tablas están vacías:** Significa que se perdieron las migraciones. Ejecutar manualmente:
```bash
railway run npx prisma migrate deploy
```

---

## P1 — Afectan jugabilidad (arreglar en el día)

### HF-04: Toast de error no legible (texto cortado)
**Síntoma:** El mensaje de error aparece cortado en pantallas de 375px (iPhone SE).  
**Fix:**
```ts
// ui/index.tsx — aumentar maxWidth del toast en pantallas pequeñas
maxWidth: 'min(340px, calc(100vw - 32px))'
```
**Archivo:** `frontend/src/components/ui/index.tsx`

### HF-05: Teclado iOS empuja el BottomSheet fuera de pantalla
**Síntoma:** Al abrir el teclado para escribir en un modal, el modal sube y queda ilegible.  
**Fix:** Añadir `position: fixed; bottom: 0` con `transform: translateY(0)` explícito.  
**Archivo:** `frontend/src/components/ui/index.tsx` (BottomSheet)

### HF-06: Resultado rápido no muestra el nombre del rival
**Síntoma:** Toast dice "Victoria 2-1" sin decir contra quién.  
**Fix:** El toast ya incluye el rival (implementado en F8). Si no aparece, es que el `rival2` no se encuentra.  
**Diagnóstico:** Ver si `state.liga` contiene el club visitante.

### HF-07: Fondo del estadio no carga en Vercel
**Síntoma:** Pantalla de login sin fondo — solo negro.  
**Causa:** `stadium-bg.png` no está en el precache del SW o no se subió a Vercel.  
**Fix:** Verificar en Vercel → Deployments → Files que existe `/stadium-bg.png`.  
**Si no está:** Está en `frontend/public/` pero puede no haberse incluido en el build.

---

## P2 — Mejoran experiencia (arreglar en 48h)

### HF-08: Instrucciones de instalación PWA en login
**Síntoma:** Los testers no saben que pueden instalar la app.  
**Fix:** Añadir texto pequeño en la pantalla de login: "💡 Instálala como app: Safari → Compartir → Añadir a inicio"  
**Archivo:** `frontend/src/pages/AuthPage.tsx`

### HF-09: "El servidor puede tardar 20s" aparece siempre
**Síntoma:** El texto de cold start aparece aunque el servidor ya esté activo.  
**Fix:** Mostrar solo si la petición tarda más de 5 segundos.
```ts
const [showSlowHint, setShowSlowHint] = useState(false);
useEffect(() => {
  if (!loading) { setShowSlowHint(false); return; }
  const t = setTimeout(() => setShowSlowHint(true), 5000);
  return () => clearTimeout(t);
}, [loading]);
```
**Archivo:** `frontend/src/pages/AuthPage.tsx`

### HF-10: Pantalla de selección de club no explica las divisiones
**Síntoma:** Los testers no saben qué significan D1/D2/D3.  
**Fix:** Añadir texto "D1 = máxima categoría (más difícil), D3 = tercera división (más fácil para empezar)".  
**Archivo:** `frontend/src/pages/TeamSelectPage.tsx`

### HF-11: Primer partido: el tester no sabe qué hacer
**Síntoma:** Llegan a la pestaña Dashboard y no encuentran el partido.  
**Fix:** En la primera jornada (jornada === 1 y partidos === 0), mostrar un tooltip o flecha apuntando a la pestaña ⚽.  
**Archivo:** `frontend/src/pages/GamePage.tsx` (DashboardTab)

---

## P3 — Para después del playtest

- Migrar Railway a plan pagado ($5/mes) para eliminar el cold start
- Añadir analytics básico (cuántos usuarios registrados, jornadas jugadas)
- Sistema de feedback in-app (botón "Reportar problema")
- Notificaciones push cuando la jornada está lista (Socket.io ya preparado)
