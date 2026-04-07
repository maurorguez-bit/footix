#!/bin/bash
# ============================================================
# FOOTIX — Acceso móvil SIN despliegue (via ngrok)
# Para playtest rápido sin cuenta de Railway/Vercel
# ============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   FOOTIX — Playtest móvil rápido (ngrok)    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Verificar ngrok
if ! command -v ngrok &>/dev/null; then
  echo "Instalando ngrok..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install ngrok/ngrok/ngrok 2>/dev/null ||     (echo "Descarga ngrok en https://ngrok.com/download" && exit 1)
  else
    echo "Descarga ngrok en https://ngrok.com/download e instálalo"
    exit 1
  fi
fi

warn "Asegúrate de que el juego está corriendo (./arrancar.sh)"
echo ""

# Exponer backend
echo "Exponiendo backend (puerto 3001)..."
ngrok http 3001 --log=stdout &
NGROK_BACKEND_PID=$!
sleep 3

BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; tunnels=json.load(sys.stdin)['tunnels']; print([t['public_url'] for t in tunnels if 'https' in t['public_url'] and '3001' in t.get('config',{}).get('addr','3001')][0])" 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
  echo "  No se pudo detectar URL automáticamente."
  read -r -p "  Pega la URL HTTPS de ngrok para el backend: " BACKEND_URL
fi

log "Backend: $BACKEND_URL"

# Actualizar frontend con nueva URL
cd frontend
echo "VITE_API_URL=${BACKEND_URL}/api" > .env.local
npm run build -- --mode production 2>/dev/null || npm run build

# Exponer frontend
echo ""
echo "Exponiendo frontend (puerto 4173)..."
npm run preview -- --host --port 4173 &
PREVIEW_PID=$!
sleep 2

ngrok http 4173 --log=stdout &
NGROK_FRONTEND_PID=$!
sleep 3

cd ..
FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; tunnels=json.load(sys.stdin)['tunnels']; urls=[t['public_url'] for t in tunnels if 'https' in t['public_url']]; print(urls[-1] if urls else '')" 2>/dev/null || echo "")

trap "kill $NGROK_BACKEND_PID $NGROK_FRONTEND_PID $PREVIEW_PID 2>/dev/null; exit" INT TERM

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ PLAYTEST MÓVIL LISTO                    ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  📱 URL para testers:                        ║"
echo "║  ${FRONTEND_URL:-  (ver consola de ngrok)}         ║"
echo "║                                              ║"
echo "║  ⚠️  LIMITACIONES:                           ║"
echo "║  - URL cambia cada reinicio                  ║"
echo "║  - Máx 40 conexiones/minuto en tier free     ║"
echo "║  - Datos solo mientras esta consola esté abierta ║"
echo "║                                              ║"
echo "║  Ctrl+C para parar                           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
wait
