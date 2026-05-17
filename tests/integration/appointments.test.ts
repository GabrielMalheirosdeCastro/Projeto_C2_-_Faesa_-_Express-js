import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/lib/auth.js';
import { prisma } from '../../src/lib/prisma.js';

const app = createApp();

async function bootstrapFixture() {
  await request(app)
    .post('/auth/register')
    .send({ email: 'pro@x.com', name: 'Pro Silva', password: 'senha12345' });
  const lpro = await request(app)
    .post('/auth/login')
    .send({ email: 'pro@x.com', password: 'senha12345' });
  const prof = await request(app)
    .post('/professionals')
    .set('Authorization', `Bearer ${lpro.body.accessToken}`)
    .send({ specialty: 'Yoga', bio: 'Instrutor certificado' });
  const svc = await request(app)
    .post('/services')
    .set('Authorization', `Bearer ${lpro.body.accessToken}`)
    .send({ name: 'Aula avulsa', durationMin: 60, priceCents: 8000 });

  await request(app)
    .post('/auth/register')
    .send({ email: 'cliente@x.com', name: 'Cliente', password: 'senha12345' });
  const lcli = await request(app)
    .post('/auth/login')
    .send({ email: 'cliente@x.com', password: 'senha12345' });

  return {
    proToken: lpro.body.accessToken as string,
    proUserId: lpro.body.user.id as string,
    professionalId: prof.body.id as string,
    serviceId: svc.body.id as string,
    clientToken: lcli.body.accessToken as string,
    clientUserId: lcli.body.user.id as string,
  };
}

async function adminToken() {
  await prisma.user.create({
    data: {
      email: 'admin@x.com',
      name: 'Admin',
      passwordHash: await hashPassword('senha12345'),
      role: 'ADMIN',
    },
  });
  const r = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@x.com', password: 'senha12345' });
  return r.body.accessToken as string;
}

describe('Appointments (integração)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrapFixture>>;

  beforeEach(async () => {
    ctx = await bootstrapFixture();
  });

  it('POST /appointments cria agendamento futuro (201)', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: future });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SCHEDULED');
  });

  it('POST /appointments rejeita data no passado (400)', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: past });
    expect(res.status).toBe(400);
  });

  it('POST /appointments sem token retorna 401', async () => {
    const res = await request(app).post('/appointments').send({});
    expect(res.status).toBe(401);
  });

  it('POST /appointments rejeita serviço inexistente (400)', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: 'inexistente', scheduledAt: future });
    expect(res.status).toBe(400);
  });

  it('GET /appointments lista apenas os próprios (USER)', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: future });
    const res = await request(app)
      .get('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /appointments/:id por não-dono retorna 403', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: future });
    const res = await request(app)
      .get(`/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${ctx.proToken}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /appointments/:id pelo dono atualiza status', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: future });
    const res = await request(app)
      .patch(`/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('DELETE /appointments/:id pelo dono faz soft delete + CANCELLED', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const created = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: future });
    const del = await request(app)
      .delete(`/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(del.status).toBe(204);
    const after = await request(app)
      .get(`/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(after.status).toBe(404);
  });

  it('GET /appointments como ADMIN lista todos', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ serviceId: ctx.serviceId, scheduledAt: future });
    const tk = await adminToken();
    const res = await request(app)
      .get('/appointments')
      .set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Professionals (integração)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrapFixture>>;

  beforeEach(async () => {
    ctx = await bootstrapFixture();
  });

  it('GET /professionals lista publicamente', async () => {
    const res = await request(app).get('/professionals');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /professionals?search filtra por especialidade', async () => {
    const res = await request(app).get('/professionals?search=Yoga');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /professionals/:id inclui serviços (use de include)', async () => {
    const res = await request(app).get(`/professionals/${ctx.professionalId}`);
    expect(res.status).toBe(200);
    expect(res.body.services).toBeInstanceOf(Array);
    expect(res.body.user).toBeDefined();
  });

  it('GET /professionals/:id inexistente retorna 404', async () => {
    const res = await request(app).get('/professionals/inexistente');
    expect(res.status).toBe(404);
  });

  it('POST /professionals duplicado para o mesmo user retorna 409', async () => {
    const res = await request(app)
      .post('/professionals')
      .set('Authorization', `Bearer ${ctx.proToken}`)
      .send({ specialty: 'Outra' });
    expect(res.status).toBe(409);
  });

  it('PATCH /professionals/:id por não-dono retorna 403', async () => {
    const res = await request(app)
      .patch(`/professionals/${ctx.professionalId}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`)
      .send({ bio: 'hack' });
    expect(res.status).toBe(403);
  });

  it('PATCH /professionals/:id pelo dono atualiza', async () => {
    const res = await request(app)
      .patch(`/professionals/${ctx.professionalId}`)
      .set('Authorization', `Bearer ${ctx.proToken}`)
      .send({ bio: 'Atualizada' });
    expect(res.status).toBe(200);
    expect(res.body.bio).toBe('Atualizada');
  });

  it('DELETE /professionals/:id pelo dono faz soft delete', async () => {
    const del = await request(app)
      .delete(`/professionals/${ctx.professionalId}`)
      .set('Authorization', `Bearer ${ctx.proToken}`);
    expect(del.status).toBe(204);
    const after = await request(app).get(`/professionals/${ctx.professionalId}`);
    expect(after.status).toBe(404);
  });
});

describe('Users (integração)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrapFixture>>;

  beforeEach(async () => {
    ctx = await bootstrapFixture();
  });

  it('GET /users/:id pelo próprio dono retorna 200', async () => {
    const res = await request(app)
      .get(`/users/${ctx.clientUserId}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('cliente@x.com');
  });

  it('GET /users/:id de outro user sem ADMIN retorna 403', async () => {
    const res = await request(app)
      .get(`/users/${ctx.proUserId}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /users/:id como ADMIN retorna 200', async () => {
    const tk = await adminToken();
    const res = await request(app)
      .get(`/users/${ctx.clientUserId}`)
      .set('Authorization', `Bearer ${tk}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /users/:id pelo dono faz soft delete (204)', async () => {
    const res = await request(app)
      .delete(`/users/${ctx.clientUserId}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /users/:id por terceiro sem ADMIN retorna 403', async () => {
    const res = await request(app)
      .delete(`/users/${ctx.proUserId}`)
      .set('Authorization', `Bearer ${ctx.clientToken}`);
    expect(res.status).toBe(403);
  });
});

