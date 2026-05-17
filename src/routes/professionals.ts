import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middlewares/authenticate.js';
import {
  createProfessionalSchema,
  updateProfessionalSchema,
} from '../schemas/professional.js';
import { buildPagination, paginatedResponse, paginationSchema } from '../lib/pagination.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';

export const professionalsRouter = Router();

// Público: listar profissionais (com filtro por especialidade)
professionalsRouter.get('/', async (req, res, next) => {
  try {
    const q = paginationSchema.parse(req.query);
    const { skip, take, page, limit } = buildPagination(q);
    const where = {
      deletedAt: null,
      ...(q.search ? { specialty: { contains: q.search } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.professional.count({ where }),
      prisma.professional.findMany({
        where,
        skip,
        take,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// Público: detalhar profissional + serviços (uso de include)
professionalsRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.professional.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        services: { where: { deletedAt: null } },
      },
    });
    if (!item || item.deletedAt) throw notFound('Profissional não encontrado');
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// Autenticado: o usuário se cadastra como profissional (1 por user)
professionalsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createProfessionalSchema.parse(req.body);
    const existing = await prisma.professional.findUnique({
      where: { userId: req.user!.sub },
    });
    if (existing) throw conflict('Usuário já possui perfil profissional');
    const created = await prisma.professional.create({
      data: { ...data, userId: req.user!.sub },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Ownership ou ADMIN
professionalsRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateProfessionalSchema.parse(req.body);
    const item = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) throw notFound('Profissional não encontrado');
    if (req.user!.role !== 'ADMIN' && item.userId !== req.user!.sub) throw forbidden();
    const updated = await prisma.professional.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Ownership ou ADMIN — soft delete
professionalsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) throw notFound('Profissional não encontrado');
    if (req.user!.role !== 'ADMIN' && item.userId !== req.user!.sub) throw forbidden();
    await prisma.professional.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
