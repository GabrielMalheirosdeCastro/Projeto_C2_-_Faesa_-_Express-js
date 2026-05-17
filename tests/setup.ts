// Setup global do Vitest: define DATABASE_URL único de teste,
// roda as migrations e limpa o banco entre os testes.
// O arquivo .db fica em os.tmpdir() para evitar handles travados pelo OneDrive
// (pasta do projeto está sincronizada — `rmSync` falha com EBUSY no Windows).
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll } from 'vitest';

const dbFile = path.join(os.tmpdir(), `api-c2-test-${process.pid}.db`);
const dbUrl = `file:${dbFile.replace(/\\/g, '/')}`;

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = dbUrl;
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.BCRYPT_ROUNDS = '4';

beforeAll(async () => {
  // NÃO apagar o arquivo aqui. Com `singleFork: true` o PrismaClient é singleton
  // entre os arquivos de teste; apagar o `.db` no Linux deixa o handle apontando
  // para um inode órfão e o próximo arquivo estoura P2021 ("table does not exist").
  // `migrate deploy` é idempotente: na primeira execução cria as tabelas, nas
  // demais vira no-op. A limpeza por teste é feita pelo `afterEach`.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
});

afterEach(async () => {
  const { prisma } = await import('../src/lib/prisma.js');
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  const { disconnectPrisma } = await import('../src/lib/prisma.js');
  await disconnectPrisma();
  try {
    if (existsSync(dbFile)) rmSync(dbFile, { force: true });
  } catch {
    // ignora — arquivo temporário será limpo pelo SO
  }
});
