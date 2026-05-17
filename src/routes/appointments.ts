import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middlewares/authenticate.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../schemas/appointment.js';
import { buildPagination, paginatedResponse, paginationSchema } from '../lib/pagination.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

export const appointmentsRouter = Router();

// Autenticado: lista os agendamentos do próprio usuário; ADMIN vê todos
appointmentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const q = paginationSchema.parse(req.query);
    const { skip, take, page, limit } = buildPagination(q);
    const where = {
      deletedAt: null,
      ...(req.user!.role === 'ADMIN' ? {} : { userId: req.user!.sub }),
    };
    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take,
        include: { service: true, user: { select: { id: true, name: true } } },
        orderBy: { scheduledAt: 'desc' },
      }),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { service: true, user: { select: { id: true, name: true } } },
    });
    if (!item || item.deletedAt) throw notFound('Agendamento não encontrado');
    if (req.user!.role !== 'ADMIN' && item.userId !== req.user!.sub) throw forbidden();
    res.json(item);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createAppointmentSchema.parse(req.body);
    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || service.deletedAt) throw badRequest('Serviço inválido');
    if (data.scheduledAt.getTime() < Date.now()) {
      throw badRequest('scheduledAt deve estar no futuro');
    }
    const created = await prisma.appointment.create({
      data: {
        userId: req.user!.sub,
        serviceId: data.serviceId,
        scheduledAt: data.scheduledAt,
        notes: data.notes,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateAppointmentSchema.parse(req.body);
    const item = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) throw notFound('Agendamento não encontrado');
    if (req.user!.role !== 'ADMIN' && item.userId !== req.user!.sub) throw forbidden();
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!item || item.deletedAt) throw notFound('Agendamento não encontrado');
    if (req.user!.role !== 'ADMIN' && item.userId !== req.user!.sub) throw forbidden();
    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
