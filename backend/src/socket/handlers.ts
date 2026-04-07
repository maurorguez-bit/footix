/**
 * SOCKET.IO HANDLERS
 * Current: single-player notifications (works completed, events, etc.)
 * Future:  multiplayer league rooms
 */

import { Server, Socket } from 'socket.io';

export function setupSocketHandlers(io: Server): void {

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ── Auth ──────────────────────────────────────────────────
    socket.on('auth', (data: { userId: string; saveSlot: number }) => {
      // Join personal room for notifications
      socket.join(`user:${data.userId}`);
      socket.join(`save:${data.userId}:${data.saveSlot}`);
      socket.emit('auth:ok', { socketId: socket.id });
    });

    // ── Multiplayer: join league room (future) ─────────────────
    socket.on('league:join', (data: { leagueId: string; userId: string }) => {
      socket.join(`league:${data.leagueId}`);
      socket.to(`league:${data.leagueId}`).emit('league:playerJoined', {
        userId: data.userId,
        socketId: socket.id,
      });
    });

    // ── Multiplayer: ready to simulate jornada ─────────────────
    socket.on('league:ready', (data: { leagueId: string; userId: string; jornada: number }) => {
      io.to(`league:${data.leagueId}`).emit('league:playerReady', data);
    });

    // ── Live match event relay ─────────────────────────────────
    // Frontend sends events as they animate; server broadcasts to spectators
    socket.on('match:event', (data: { saveId: string; event: unknown }) => {
      socket.broadcast.to(`save:${data.saveId}`).emit('match:event', data.event);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

// ── Server-side notification helpers ──────────────────────────

export function notifyUser(io: Server, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function notifyWorkCompleted(io: Server, userId: string, label: string): void {
  notifyUser(io, userId, 'work:completed', { label, timestamp: Date.now() });
}

export function notifyNewEvent(io: Server, userId: string, event: unknown): void {
  notifyUser(io, userId, 'game:event', { event, timestamp: Date.now() });
}
