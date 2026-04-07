# FOOTIX — Fallos esperables en playtest móvil

Lista de lo que puede pasar y cómo responder.

---

## Fallos seguros (no pérdida de datos)

### F1 — "Sin conexión con el servidor" al hacer login
**Causa:** Railway en tier free duerme tras 30 minutos de inactividad.  
**Impacto:** Ninguno — los datos están en PostgreSQL.  
**Solución:** Esperar 20 segundos y volver a pulsar el botón. El servidor arranca solo.  
**Hotfix:** Añadir un keep-alive ping cada 25 minutos (ver lista de hotfixes).

### F2 — La pantalla se queda en blanco al cargar
**Causa:** Fallo del Service Worker al actualizar la app.  
**Impacto:** Ninguno — los datos están en el servidor.  
**Solución:** Borrar caché del navegador y recargar. En iOS: ajustes → Safari → Borrar historial.  
**Hotfix:** Añadir versión de caché al SW.

### F3 — El toast (mensaje de notificación) aparece debajo de la cámara (notch)
**Causa:** Algunos modelos de iPhone tienen notch más grande de lo esperado.  
**Impacto:** Estético.  
**Solución:** Nada por ahora — el mensaje desaparece en 3 segundos.  
**Hotfix:** Ajustar `safe-area-inset-top` en el Toast.

### F4 — Partido simulado pero parece que no guardó
**Causa:** El backend tardó más de 10s en responder (Railway lento).  
**Síntoma:** Recargar y la jornada sigue igual que antes.  
**Solución:** Simular de nuevo — el backend lo detecta como jornada ya jugada.  
**Hotfix:** Añadir indicador de "guardando..." más visible.

### F5 — No aparece el banner de instalación PWA en iOS
**Causa:** iOS no muestra banner automático — requiere el paso manual.  
**Solución:** Instruir al tester: Safari → ícono compartir → "Añadir a inicio de pantalla".  
**Hotfix:** Añadir instrucciones de instalación en la pantalla de login.

---

## Fallos que requieren intervención

### F6 — "Error 500" en cualquier acción
**Causa:** Error en el backend — ver logs en Railway.  
**Acción:** Railway → proyecto → Deployments → Logs → identificar el error.  
**Datos:** NO se pierden. El error es de procesamiento, no de BD.

### F7 — El tester no puede iniciar sesión (credenciales correctas)
**Causa posible:** JWT_SECRET cambió entre deploys → tokens invalidados.  
**Acción:** El tester necesita registrarse de nuevo (perderá su partida actual).  
**Hotfix:** No cambiar JWT_SECRET entre deploys durante el playtest.

### F8 — Partidas de distintos testers se mezclan
**Causa:** Imposible si JWT está bien implementado.  
**Si ocurre:** Bug crítico — parar el playtest y revisar middleware de auth.

---

## No son fallos

- El juego tarda en cargar la primera vez (20-30s) → normal, cold start.
- La primera jornada parece más difícil → correcto, los equipos CPU son buenos.
- El tester "pierde" porque no firmó patrocinador → correcto, es una mecánica.
- Los nombres de jugadores parecen inventados → son generados, no reales.
