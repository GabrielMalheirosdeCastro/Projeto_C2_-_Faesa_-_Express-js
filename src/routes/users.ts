import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { buildPagination, paginatedResponse, paginationSchema } from '../lib/pagination.js';
import { forbidden, notFound } from '../lib/errors.js';

export const usersRouter = Router();

function publicUser(u: { id: string; email: string; name: string; role: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

// ADMIN-only: listar todos os usuários (com paginação)
usersRouter.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const q = paginationSchema.parse(req.query);
    const { skip, take, page, limit } = buildPagination(q);
    const where = {
      deletedAt: null,
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search } },
              { name: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    ]);
    res.json(paginatedResponse(users.map(publicUser), total, page, limit));
  } catch (err) {
    next(err);
  }
});

// Ownership ou ADMIN: ver detalhes de um usuário
usersRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user!.role !== 'ADMIN' && req.user!.sub !== id) throw forbidden();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw notFound('Usuário não encontrado');
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

// Ownership: soft delete da própria conta (ou ADMIN deletando qualquer)
usersRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user!.role !== 'ADMIN' && req.user!.sub !== id) throw forbidden();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw notFound('Usuário não encontrado');
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
