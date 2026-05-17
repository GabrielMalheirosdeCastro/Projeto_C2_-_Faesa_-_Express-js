import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../lib/auth.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.js';
import { conflict, notFound, unauthorized } from '../lib/errors.js';

export const authRouter = Router();

function toPublicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict('E-mail já cadastrado');
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });
    res.status(201).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) throw unauthorized('Credenciais inválidas');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw unauthorized('Credenciais inválidas');
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN',
    };
    res.json({
      user: toPublicUser(user),
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.deletedAt) throw unauthorized('Usuário inválido');
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN',
    };
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user || user.deletedAt) throw notFound('Usuário não encontrado');
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});
