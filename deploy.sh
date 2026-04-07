#!/bin/bash
# ============================================================
# FOOTIX — Despliegue en Railway (PostgreSQL) + Vercel
# Ejecutar desde la raíz: bash deploy.sh
# Tiempo estimado: 15-20 minutos
# ============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo -e "\n${BOLD}═══ $1 ═══${NC}"; }
ask()  { echo -e "${YELLOW}👉 $1${NC}"; read -r REPLY; echo "$REPLY"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   FOOTIX — Despliegue Railway + Vercel       ║${NC}"
echo -e "${BOLD}║   Base de datos: PostgreSQL                   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

command -v node &>/dev/null || err "Necesitas Node.js 18+"
command -v git  &>/dev/null || err "Necesitas Git instalado"
log "Herramientas base OK"

# ─────────────────────────────────────────────────────────────
step "PASO 1: Repositorio Git"
# ─────────────────────────────────────────────────────────────
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Footix v2 RC — initial"
  log "Git inicializado"
else
  git add .
  git commit -m "Footix v2 RC — update" 2>/dev/null || true
  log "Git actualizado"
fi

# ─────────────────────────────────────────────────────────────
step "PASO 2: Railway — Backend + PostgreSQL"
# ─────────────────────────────────────────────────────────────
cat << 'INFO'
INSTRUCCIONES RAILWAY:

  1. Ve a https://railway.app y crea cuenta con GitHub (gratis)

  2. Dashboard → "New Project" → "Deploy from GitHub repo"
     → Selecciona este repositorio

  3. Railway detecta railway.json automáticamente

  4. En el proyecto, haz clic en "+ New" → "Database" → "PostgreSQL"
     Railway crea la BD y añade DATABASE_URL automáticamente ✅

  5. En el servicio del backend → "Variables" → añade:

     JWT_SECRET     = (genera con: openssl rand -hex 32)
     NODE_ENV       = production
     PORT           = 3001
     CLIENT_URL     = (añadirlo después de obtener URL de Vercel)

  6. Railway hace build y deploy automáticamente
     Espera el healthcheck: GET /api/health → {"status":"ok"}

INFO
BACKEND_URL=$(ask "Cuando railway esté listo, pega la URL del backend (ej: https://footix-production.railway.app): ")
[ -z "$BACKEND_URL" ] && err "URL del backend requerida"
# Quitar / final si existe
BACKEND_URL="${BACKEND_URL%/}"
log "Backend URL: $BACKEND_URL"

# Verificar que el backend responde
echo "  Verificando backend..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  log "Backend responde correctamente (200 OK)"
else
  warn "El backend devolvió HTTP $HTTP_STATUS — verifica los logs en Railway"
  ask "¿Continuar de todas formas? (Enter para sí)"
fi

# ─────────────────────────────────────────────────────────────
step "PASO 3: Configurar frontend con URL del backend"
# ─────────────────────────────────────────────────────────────
cat > frontend/.env.production.local << ENVEOF
# Generado automáticamente por deploy.sh
VITE_API_URL=${BACKEND_URL}/api
ENVEOF
log "frontend/.env.production.local creado"

# ─────────────────────────────────────────────────────────────
step "PASO 4: Build del frontend"
# ─────────────────────────────────────────────────────────────
cd frontend
npm install --silent
VITE_API_URL="${BACKEND_URL}/api" npm run build
log "Build del frontend completado"
cd ..

# ─────────────────────────────────────────────────────────────
step "PASO 5: Vercel — Frontend PWA"
# ─────────────────────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  warn "Instalando Vercel CLI..."
  npm install -g vercel --silent
fi

cd frontend

# Login a Vercel si hace falta
vercel whoami 2>/dev/null || vercel login

# Deploy con env var
vercel --prod --yes \
  --env "VITE_API_URL=${BACKEND_URL}/api" \
  2>&1 | tee /tmp/vercel_output.txt

FRONTEND_URL=$(grep -o 'https://[^ ]*\.vercel\.app' /tmp/vercel_output.txt | head -1 || \
               grep -o 'https://[^ ]*' /tmp/vercel_output.txt | head -1 || echo "")
cd ..

if [ -z "$FRONTEND_URL" ]; then
  FRONTEND_URL=$(ask "Pega la URL de Vercel que aparece en la consola: ")
fi
FRONTEND_URL="${FRONTEND_URL%/}"
log "Frontend URL: $FRONTEND_URL"

# ─────────────────────────────────────────────────────────────
step "PASO 6: Actualizar CORS en Railway"
# ─────────────────────────────────────────────────────────────
cat << INFO
  En Railway → tu proyecto → Variables → añade/actualiza:

  CLIENT_URL = ${FRONTEND_URL}

  Railway hará redeploy automático en ~1 minuto.
INFO
ask "Pulsa Enter cuando hayas actualizado CLIENT_URL en Railway..."

# ─────────────────────────────────────────────────────────────
step "PASO 7: Verificación de persistencia"
# ─────────────────────────────────────────────────────────────
echo "  Verificando que la BD responde..."
sleep 5
STATUS=$(curl -s "${BACKEND_URL}/api/health" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "error")
if [ "$STATUS" = "ok" ]; then
  log "Backend + PostgreSQL operativos"
else
  warn "Estado del backend: $STATUS (revisa logs de Railway)"
fi

# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ DESPLIEGUE COMPLETADO                   ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  📱 URL para testers:                        ║"
printf "║  %-44s║\n" "  ${FRONTEND_URL}"
echo "║                                              ║"
printf "║  ⚙️  Backend:                               ║\n"
printf "║  %-44s║\n" "  ${BACKEND_URL}"
echo "║                                              ║"
echo "║  🗄️  Base de datos: PostgreSQL (Railway)     ║"
echo "║     → datos persistentes y seguros           ║"
echo "║                                              ║"
echo "║  Para instalar en iOS:                       ║"
echo "║    Safari → Compartir → Añadir a inicio      ║"
echo "║  Para instalar en Android:                   ║"
echo "║    Chrome → Menú ⋮ → Instalar aplicación     ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Guardar URLs para referencia
cat > DEPLOY_INFO.txt << INFOEOF
Footix — Despliegue RC
======================
Frontend (Vercel): ${FRONTEND_URL}
Backend (Railway): ${BACKEND_URL}
Base de datos:     PostgreSQL (Railway managed)
Fecha:             $(date)
INFOEOF
log "URLs guardadas en DEPLOY_INFO.txt"
