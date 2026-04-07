# FOOTIX — Checklist de verificación post-deploy

Ejecutar ANTES de compartir la URL con testers.

## A. Backend (Railway)

- [ ] `GET https://TU-BACKEND.railway.app/api/health` devuelve `{"status":"ok","version":"2.0.0"}`
- [ ] Railway muestra "Active" en el servicio (no "Sleeping")
- [ ] Railway → Logs no muestra errores rojos en el arranque
- [ ] Variables de entorno: DATABASE_URL, JWT_SECRET, CLIENT_URL, NODE_ENV configuradas
- [ ] PostgreSQL aparece como "Connected" en Railway

## B. Base de datos (PostgreSQL)

- [ ] Railway → PostgreSQL → Tables muestra `User` y `GameSave`
- [ ] `User` table: columnas id, email, password, nombre, createdAt, updatedAt
- [ ] `GameSave` table: columnas id, userId, slot, state (TEXT), clubNombre, temporada, jornada

## C. Frontend (Vercel)

- [ ] `https://TU-PROYECTO.vercel.app` carga sin error 404 o pantalla en blanco
- [ ] Las imágenes (logo, fondo estadio) aparecen en la pantalla de login
- [ ] No hay errores CORS en la consola del navegador (F12 → Console)
- [ ] `VITE_API_URL` configurado en Vercel → Settings → Environment Variables

## D. Flujo completo (hacer desde móvil real)

- [ ] Registrar cuenta nueva → llega al selector de clubs
- [ ] Seleccionar club → entrar al juego
- [ ] Simular 1 jornada → ver resultado
- [ ] Cerrar el navegador completamente
- [ ] Volver a la URL → Login → partida guardada en el slot correcto
- [ ] Jornada muestra el número correcto (no volvió a J1)

## E. PWA (iPhone — Safari)

- [ ] Abrir URL en Safari → aparece banner "Añadir a inicio" O está disponible en Compartir
- [ ] Instalar en pantalla de inicio → icono de Footix visible
- [ ] Abrir desde el icono → carga en modo pantalla completa (sin barra de Safari)
- [ ] Login funciona desde la versión instalada

## F. PWA (Android — Chrome)

- [ ] Chrome muestra banner de instalación al cabo de unos segundos
- [ ] O: menú ⋮ → "Instalar aplicación" disponible
- [ ] Instalar → icono en pantalla de inicio
- [ ] Abrir → pantalla completa, sin barra del navegador

## G. Multi-tester

- [ ] Crear 2 cuentas distintas en incógnito → cada una ve solo sus partidas
- [ ] Simular en ambas cuentas a la vez → no hay conflictos
