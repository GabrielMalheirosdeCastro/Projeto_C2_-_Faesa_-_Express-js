import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../src/schemas/auth.js';
import { createServiceSchema } from '../../src/schemas/service.js';
import { createAppointmentSchema } from '../../src/schemas/appointment.js';

describe('schemas Zod', () => {
  it('registerSchema rejeita e-mail inválido', () => {
    const r = registerSchema.safeParse({ email: 'naoeh', name: 'Ana', password: '12345678' });
    expect(r.success).toBe(false);
  });

  it('registerSchema rejeita senha curta', () => {
    const r = registerSchema.safeParse({ email: 'a@b.com', name: 'Ana', password: '123' });
    expect(r.success).toBe(false);
  });

  it('registerSchema aceita input válido', () => {
    const r = registerSchema.safeParse({
      email: 'a@b.com',
      name: 'Ana',
      password: 'abcdefgh',
    });
    expect(r.success).toBe(true);
  });

  it('loginSchema exige email e senha', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });

  it('createServiceSchema rejeita preço negativo', () => {
    const r = createServiceSchema.safeParse({
      name: 'X',
      durationMin: 30,
      priceCents: -1,
    });
    expect(r.success).toBe(false);
  });

  it('createAppointmentSchema aceita scheduledAt como string ISO', () => {
    const r = createAppointmentSchema.safeParse({
      serviceId: 'svc_1',
      scheduledAt: '2030-01-01T10:00:00Z',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.scheduledAt).toBeInstanceOf(Date);
  });
});
