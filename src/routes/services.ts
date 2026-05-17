import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middlewares/authenticate.js';
import { createServiceSchema, updateServiceSchema } from '../schemas/service.js';
import { buildPagination, paginatedResponse, paginationSchema } from '../lib/pagination.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

export const servicesRouter = Router();

// Público: listar serviços (paginação + busca por nome)
servicesRouter.get('/', async (req, res, next) => {
  try {
    const q = paginationSchema.parse(req.query);
    const { skip, take, page, limit } = buildPagination(q);
    const where = {
      deletedAt: null,
      ...(q.search ? { name: { contains: q.search } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        skip,
        take,
        include: { professional: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (err) {
    next(err);
  }
});

servicesRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { professional: { include: { user: { select: { name: true } } } } },
    });
    if (!item || item.deletedAt) throw notFound('Serviço não encontrado');
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// Autenticado: só profissionais cadastrados criam serviços
servicesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createServiceSchema.parse(req.body);
    const professional = await prisma.professional.findUnique({
      where: { userId: req.user!.sub },
    });
    if (!professional || professional.deletedAt) {
      throw badRequest('Usuário não possui perfil profissional');
    }
    const created = await prisma.service.create({
      data: { ...data, professionalId: professional.id },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Ownership (dono do serviço via professional.userId) ou ADMIN
servicesRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateServiceSchema.parse(req.body);
    const item = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { professional: true },
    });
    if (!item || item.deletedAt) throw notFound('Serviço não encontrado');
    if (req.user!.role !== 'ADMIN' && item.professional.userId !== req.user!.sub) {
      throw forbidden();
    }
    const updated = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

servicesRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { professional: true },
    });
    if (!item || item.deletedAt) throw notFound('Serviço não encontrado');
    if (req.user!.role !== 'ADMIN' && item.professional.userId !== req.user!.sub) {
      throw forbidden();
    }
    await prisma.service.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
