import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import { authRouter } from './routes/auth';
import { gameRouter } from './routes/game';
import { matchRouter } from './routes/match';
import { marketRouter, trainingRouter, eventsRouter, trivialRouter, lootRouter } from './routes/market';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/handlers';

export const prisma = new PrismaClient();

const app = express();
const httpServer = createServer(app);

// ── Socket.io (ready for multiplayer) ────────────────────────
export const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});
setupSocketHandlers(io);

// ── Middleware ────────────────────────────────────────────────
// En producción, CLIENT_URL puede ser una lista separada por comas
const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origin (mobile apps, curl)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    cb(new Error(`CORS: ${origin} no permitido`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // GameState can be large
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/game',     gameRouter);
app.use('/api/match',    matchRouter);
app.use('/api/market',   marketRouter);
app.use('/api/training', trainingRouter);
app.use('/api/events',   eventsRouter);
app.use('/api/trivial',  trivialRouter);
app.use('/api/loot',     lootRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ── Error handler (must be last) ──────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001');

async function main() {
  await prisma.$connect();
  console.log('✅ Database connected');

  httpServer.listen(PORT, () => {
    console.log(`🚀 FútbolManager API running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready for multiplayer`);
  });
}

main().catch(err => {
  console.error('❌ Startup error:', err);
  process.exit(1);
});
