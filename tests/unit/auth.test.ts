import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../src/lib/auth.js';

describe('auth helpers', () => {
  it('hash de senha difere do plaintext', async () => {
    const hash = await hashPassword('senha-secreta');
    expect(hash).not.toBe('senha-secreta');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifyPassword aceita senha correta', async () => {
    const hash = await hashPassword('minhasenha123');
    expect(await verifyPassword('minhasenha123', hash)).toBe(true);
  });

  it('verifyPassword rejeita senha incorreta', async () => {
    const hash = await hashPassword('minhasenha123');
    expect(await verifyPassword('errada', hash)).toBe(false);
  });

  it('signAccessToken + verifyAccessToken preservam payload', () => {
    const token = signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'USER' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.role).toBe('USER');
  });

  it('signRefreshToken + verifyRefreshToken preservam payload', () => {
    const token = signRefreshToken({ sub: 'u2', email: 'x@y.com', role: 'ADMIN' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('u2');
    expect(decoded.role).toBe('ADMIN');
  });

  it('verifyAccessToken lança erro para token inválido', () => {
    expect(() => verifyAccessToken('lixo')).toThrow();
  });
});
