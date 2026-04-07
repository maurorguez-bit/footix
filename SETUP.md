# Arrancar FútbolManager en 5 minutos

## Requisitos
- Node.js 18+ → https://nodejs.org
- Git (opcional)

## Pasos

```bash
# 1. Entra al proyecto
cd futbolmanager

# 2. Instala dependencias (backend + frontend)
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Configura la base de datos
cd backend
cp .env.example .env
npx prisma generate
npx prisma db push
cd ..

# 4. Arranca todo
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

## Abrir en el móvil (misma red WiFi)

```bash
# En terminal 2 cambia el comando a:
cd frontend && npm run dev -- --host

# Verás algo como:
# Local:   http://localhost:5173
# Network: http://192.168.1.XX:5173  ← Esta URL en el móvil
```

Abre esa URL en Safari (iOS) o Chrome (Android).

### Instalar como app (PWA)

**iOS Safari:** Compartir → Añadir a pantalla de inicio  
**Android Chrome:** Menú → Instalar aplicación

## Para multijugador futuro
Sube el backend a Railway/Render y actualiza CLIENT_URL y la URL de la API en el frontend.
