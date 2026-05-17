import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/lib/auth.js';
import { prisma } from '../../src/lib/prisma.js';

const app = createApp();

describe('Auth + ownership (integração)', () => {
  it('POST /auth/register cria conta com sucesso (201)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'novo@x.com', name: 'Novo', password: 'senha12345' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('novo@x.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/register rejeita e-mail duplicado (409)', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@x.com', name: 'Alice', password: 'senha12345' });
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@x.com', name: 'Bob', password: 'senha12345' });
    expect(res.status).toBe(409);
  });

  it('POST /auth/register rejeita senha curta (422)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'curta@x.com', name: 'Aaa', password: '123' });
    expect(res.status).toBe(422);
  });

  it('POST /auth/login com credencial inválida retorna 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'naoexiste@x.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login com sucesso retorna accessToken + refreshToken', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@x.com', name: 'Lara', password: 'senha12345' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@x.com', password: 'senha12345' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('GET /auth/me sem token retorna 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me com token retorna o usuário', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'me@x.com', name: 'Me', password: 'senha12345' });
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'me@x.com', password: 'senha12345' });
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@x.com');
  });

  it('GET /users sem ADMIN retorna 403', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'user@x.com', name: 'Ulisses', password: 'senha12345' });
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'user@x.com', password: 'senha12345' });
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /users com ADMIN retorna 200 + paginação', async () => {
    await prisma.user.create({
      data: {
        email: 'admin@x.com',
        name: 'Adm',
        passwordHash: await hashPassword('senha12345'),
        role: 'ADMIN',
      },
    });
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@x.com', password: 'senha12345' });
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('CRUD Services + ownership', () => {
  let userToken: string;
  let otherToken: string;
  let serviceId: string;

  // afterEach do setup global limpa o DB entre cada it, então recriamos as fixtures
  // a cada teste para garantir isolamento.
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dono@x.com', name: 'Dono', password: 'senha12345' });
    const l1 = await request(app)
      .post('/auth/login')
      .send({ email: 'dono@x.com', password: 'senha12345' });
    userToken = l1.body.accessToken;

    await request(app)
      .post('/auth/register')
      .send({ email: 'outro@x.com', name: 'Outro', password: 'senha12345' });
    const l2 = await request(app)
      .post('/auth/login')
      .send({ email: 'outro@x.com', password: 'senha12345' });
    otherToken = l2.body.accessToken;

    await request(app)
      .post('/professionals')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ specialty: 'Estética' });

    const svc = await request(app)
      .post('/services')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Limpeza de pele', durationMin: 60, priceCents: 20000 });
    expect(svc.status).toBe(201);
    serviceId = svc.body.id;
  });

  it('GET /services lista publicamente', async () => {
    const res = await request(app).get('/services');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /services/:id retorna com include do profissional', async () => {
    const res = await request(app).get(`/services/${serviceId}`);
    expect(res.status).toBe(200);
    expect(res.body.professional).toBeDefined();
  });

  it('PATCH /services/:id por usuário não-dono retorna 403', async () => {
    const res = await request(app)
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ priceCents: 1 });
    expect(res.status).toBe(403);
  });

  it('PATCH /services/:id pelo dono atualiza', async () => {
    const res = await request(app)
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ priceCents: 25000 });
    expect(res.status).toBe(200);
    expect(res.body.priceCents).toBe(25000);
  });

  it('DELETE /services/:id pelo dono faz soft delete (204)', async () => {
    const res = await request(app)
      .delete(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(204);
    const after = await request(app).get(`/services/${serviceId}`);
    expect(after.status).toBe(404);
  });
});
