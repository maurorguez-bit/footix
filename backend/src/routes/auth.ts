import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/errorHandler';

export const authRouter = Router();

const registerSchema = z.object({
  email:  z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(2, 'Nombre demasiado corto'),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

function signToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
}

// ── POST /api/auth/register ───────────────────────────────────
authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { email, password, nombre } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email ya registrado' });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user   = await prisma.user.create({
    data: { email, password: hashed, nombre },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });

  const token = signToken(user.id, user.email);
  return res.status(201).json({ token, user });
});

// ── POST /api/auth/login ──────────────────────────────────────
authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = signToken(user.id, user.email);
  return res.json({
    token,
    user: { id: user.id, email: user.email, nombre: user.nombre },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json(user);
});
