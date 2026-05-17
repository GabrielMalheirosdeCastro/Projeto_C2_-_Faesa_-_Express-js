# Plano de Ação — Inicialização do Projeto C2 (API REST de Agendamento)

**Data:** 2026-05-17
**Solicitado por:** Gabriel Malheiros de Castro
**Contexto:** Repositório novo (Projeto C2 — Faesa — Express.js) ainda carrega configurações
copiadas do projeto anterior (Site de Acolhimento FAESA / LaTeX + EasyPanel). É necessário
limpar o legado, reescrever as instruções do Copilot para a nova stack e gerar o scaffold
mínimo para começar a desenvolver a API REST exigida pela avaliação C2 (Prof. Otávio Lube).

## Objetivo

Deixar o repositório pronto para desenvolvimento da API REST de **Agendamento de Serviços**
em Node.js + TypeScript + Express + Prisma/SQLite, com pipeline de CI (Vitest) e deploy
opcional no EasyPanel em `api-c2.gmcsistemas.com.br`, cumprindo integralmente o enunciado
do trabalho e mirando os pontos extras (+1,0).

## Decisões já confirmadas

| Item | Decisão |
|---|---|
| Domínio de negócio | Agendamento de serviços — `User`, `Service`, `Professional`, `Appointment` |
| Banco | SQLite com adapter `better-sqlite3` (obrigatório pelo enunciado) |
| Deploy | EasyPanel em `api-c2.gmcsistemas.com.br` com volume Docker persistente para `dev.db` |
| Extras alvo (+1,0) | Paginação/filtros, soft delete, refresh tokens, CI Vitest, OpenAPI/Swagger em `/docs` |
| Legado `.vscode/` e `.github/` | Substituir integralmente |
| `docs/secrets.md` | Adicionar ao `.gitignore` antes de qualquer `git add` |

## Etapas

### Fase 1 — Higienização e segurança (bloqueante)

- [ ] 1. Criar `.gitignore` novo cobrindo: `node_modules/`, `dist/`, `coverage/`, `.env`,
       `.env.*` (exceto `.env.example`), `docs/secrets.md`, `prisma/dev.db`,
       `prisma/dev.db-journal`, `*.log`, `.DS_Store`.
- [ ] 2. Validar com `git check-ignore -v docs/secrets.md` e `git check-ignore -v .env`.
- [ ] 3. Remover os arquivos legados do projeto anterior:
       - `.vscode/settings.json` (LaTeX Workshop)
       - `.vscode/tasks.json` (deploy/dev/docker do projeto antigo)
       - `.vscode/launch.json` (apps/web inexistente)
       - `.github/workflows/deploy.yml` (webhook do EasyPanel do projeto antigo)

### Fase 2 — Reescrita das instruções do Copilot

- [ ] 4. Reescrever `.github/copilot-instructions.md` do zero refletindo:
       - Disciplina e enunciado da C2 (Prof. Otávio Lube, 10,0 pts, individual).
       - Stack TS/Express/Prisma SQLite/Vitest/Zod/JWT/bcrypt.
       - Estrutura `src/{lib,middlewares,routes,schemas,app.ts,server.ts}` + `tests/`.
       - Conventional Commits em pt-BR, bump de versão antes de commit, atomicidade.
       - Procedimento de pesquisa, planos de ação, manutenção de README/CHANGELOG.
       - Regras de deploy (EasyPanel via webhook) e CI (GitHub Actions).
       - Postura zero-fluff (manter da versão anterior).

### Fase 3 — Scaffold do projeto

- [ ] 5. Criar `package.json` (Node 20+, ESM, scripts `dev`, `build`, `start`, `test`,
       `test:coverage`, `prisma:migrate`, `prisma:generate`, `lint`).
- [ ] 6. Criar `tsconfig.json` (target ES2022, module NodeNext, strict, outDir `dist`).
- [ ] 7. Criar `vitest.config.ts` com cobertura V8 (lines + functions ≥ 70%) e setup file.
- [ ] 8. Criar `prisma/schema.prisma` com:
       - `User` (id, email único, passwordHash, role enum USER/ADMIN, deletedAt nullable).
       - `Professional` (1:N com User opcional, 1:N com Service).
       - `Service` (N:1 Professional, nome, duração, preço).
       - `Appointment` (N:1 User, N:1 Service, scheduledAt, status enum).
- [ ] 9. Criar estrutura `src/`:
       - `lib/prisma.ts`, `lib/auth.ts` (hash, verify, sign, verifyToken, refresh).
       - `middlewares/authenticate.ts`, `middlewares/authorize.ts`, `middlewares/error.ts`.
       - `schemas/` (Zod por entidade).
       - `routes/auth.ts`, `routes/users.ts`, `routes/services.ts`,
         `routes/professionals.ts`, `routes/appointments.ts`.
       - `app.ts` (factory `createApp()`) e `server.ts` (bootstrap).
       - `swagger.ts` (OpenAPI servido em `/docs`).
- [ ] 10. Criar `tests/setup.ts`, `tests/unit/` (5+ testes de helpers/Zod) e
        `tests/integration/` (10+ testes via Supertest com banco SQLite isolado).
- [ ] 11. Criar `.env.example` documentando `DATABASE_URL`, `JWT_SECRET`,
        `JWT_REFRESH_SECRET`, `PORT`, `NODE_ENV`.

### Fase 4 — Infraestrutura: Docker + CI/CD

- [ ] 12. Criar `Dockerfile` multi-stage (build TS → runtime Alpine) preparado para volume
        montado em `/app/prisma` (persistência do SQLite no EasyPanel).
- [ ] 13. Criar `.dockerignore`.
- [ ] 14. Criar `.github/workflows/ci.yml` rodando `npm ci`, `npm run lint`,
        `npm run test:coverage` em push e PR.
- [ ] 15. Criar `.github/workflows/deploy.yml` disparando webhook do novo serviço
        EasyPanel (secret `EASYPANEL_DEPLOY_WEBHOOK_C2`) apenas em push para `master`.

### Fase 5 — Documentação

- [ ] 16. Criar `README.md` com: descrição do domínio, lista de entidades, instruções
        (`npm install`, `npx prisma migrate dev`, `npm run dev`, `npm test`),
        exemplos curl, link para Swagger e instruções de deploy.
- [ ] 17. Criar `CHANGELOG.md` com seção `[Unreleased]` e `[0.1.0]` inicial.
- [ ] 18. Criar `.vscode/settings.json` (TS + ESLint + Prettier + Prisma),
        `.vscode/tasks.json` (dev/test/build/migrate) e `.vscode/launch.json`
        (Node debug + Vitest debug).

## Impacto Esperado

- **Arquivos removidos:** `.vscode/settings.json`, `.vscode/tasks.json`,
  `.vscode/launch.json`, `.github/workflows/deploy.yml`.
- **Arquivos criados:** ~25 arquivos novos cobrindo scaffold, Prisma, src/, tests/, Docker,
  CI/CD e documentação.
- **README/CHANGELOG:** criados do zero (não existem ainda).
- **`docs/secrets.md`:** permanece no disco mas garantidamente fora do Git.

## Riscos e Cuidados

- **`docs/secrets.md` exposto:** se o `.gitignore` não for o primeiro commit, segredos vão
  para o GitHub público. Etapa 1 é bloqueante.
- **`better-sqlite3` em container:** requer build nativo. O Dockerfile precisa de
  `python3 make g++` no estágio de build e o volume persistente é obrigatório no EasyPanel.
- **Conflito com enunciado:** SQLite é requisito explícito. Não introduzir Postgres nem
  Supabase neste projeto.
- **Plágio:** trabalho individual. Código copiado de colegas/IA sem compreensão zera a nota.
- **Bump de versão:** começar em `0.1.0` no `package.json`; mover `[Unreleased]` para versão
  ao primeiro commit funcional.

## Critério de Conclusão

1. `npm install && npx prisma migrate dev && npm run dev` sobe o servidor em `localhost:3000`
   sem erros.
2. `npm run test:coverage` passa com ≥70% lines/functions.
3. `git push` para `master` dispara o `ci.yml` (verde) e o `deploy.yml` (webhook 200 OK).
4. `https://api-c2.gmcsistemas.com.br/healthz` retorna 200 e `/docs` exibe o Swagger.
5. `docs/secrets.md` confirmado fora do Git via `git ls-files | findstr secrets`.

## Execução

Plano será executado em **commits atômicos**, um por fase, seguindo Conventional Commits em
pt-BR. Cada commit inclui bump apropriado em `package.json` + entrada no `CHANGELOG.md`.
