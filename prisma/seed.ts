// Seed inicial: cria 1 ADMIN, 1 USER profissional e 1 serviço de exemplo.
// Uso: npm run prisma:seed
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/auth.js';

async function main() {
  const adminPass = await hashPassword('admin12345');
  const proPass = await hashPassword('professional12345');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@faesa.dev' },
    update: {},
    create: {
      email: 'admin@faesa.dev',
      name: 'Administrador',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  const pro = await prisma.user.upsert({
    where: { email: 'pro@faesa.dev' },
    update: {},
    create: {
      email: 'pro@faesa.dev',
      name: 'Profissional Exemplo',
      passwordHash: proPass,
      role: 'USER',
    },
  });

  const professional = await prisma.professional.upsert({
    where: { userId: pro.id },
    update: {},
    create: {
      userId: pro.id,
      specialty: 'Psicologia',
      bio: 'Atendimento clínico geral.',
    },
  });

  await prisma.service.create({
    data: {
      professionalId: professional.id,
      name: 'Sessão inicial',
      description: 'Sessão de avaliação inicial.',
      durationMin: 50,
      priceCents: 15000,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed concluído. Admin: ${admin.email} / Pro: ${pro.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
