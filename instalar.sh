#!/bin/bash
set -e
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${GREEN}✅ $1${NC}"; }; err() { echo -e "${RED}❌ $1${NC}"; exit 1; }
echo "╔══════════════════════╗"; echo "║  FOOTIX — Setup      ║"; echo "╚══════════════════════╝"
command -v node &>/dev/null || err "Instala Node.js 18+ en https://nodejs.org"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1); [ "$NODE_VER" -ge 18 ] || err "Necesitas Node.js 18+"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📦 Backend..."; cd "$SCRIPT_DIR/backend" && npm install --silent; log "Backend OK"
[ -f .env ] || cp .env.example .env
echo "📦 Frontend..."; cd "$SCRIPT_DIR/frontend" && npm install --silent; log "Frontend OK"
echo ""; echo "╔══════════════════════════════════╗"
echo "║  ✅ Instalado                    ║"
echo "║  Deploy: bash deploy.sh          ║"
echo "╚══════════════════════════════════╝"
