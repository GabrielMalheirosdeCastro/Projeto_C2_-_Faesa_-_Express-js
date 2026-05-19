# Changelog

Todas as mudanças relevantes deste projeto serão documentadas aqui.

Formato baseado em [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
e versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- `docs/api.http` — coleção de requisições no formato REST Client (importável
  no Postman/Insomnia) cobrindo o fluxo completo de autenticação + CRUD das
  4 entidades, com cenários de erro (401/403/404/409/422). Atende ao
  entregável §7.5 do enunciado da C2.
- Seção "Cobertura atual", "Coleção de requisições" e "Entregáveis
  (mapeamento com o enunciado)" no `README.md`, listando 1-a-1 os requisitos
  técnicos, funcionalidades, testes e entregáveis exigidos pelo Prof.
  Otávio Lube, com link para cada arquivo de evidência.

## [0.1.4] - 2026-05-17

### Added

- `eslint.config.js` (flat config do ESLint 9) com `@typescript-eslint`, ignorando
  `dist/`, `coverage/` e `prisma/migrations/`. Sem ele o step `Lint` do CI
  quebrava com exit 2 (`ESLint couldn't find an eslint.config.(js|mjs|cjs) file`),
  pois o ESLint 9 removeu o suporte ao `.eslintrc.*` legado.
- Script `npm run typecheck` (`tsc --noEmit -p tsconfig.build.json`) e atalho
  `npm run verify` (`typecheck + build + test:coverage`) para o checklist
  pré-push obrigatório.
- Steps `Typecheck` e `Build` no `.github/workflows/ci.yml` antes do step de
  testes, garantindo que regressões de tipo/layout sejam detectadas no CI
  (não apenas no build do Docker do EasyPanel).
- `.github/copilot-instructions.md` §5.1 — checklist obrigatório antes de
  `git push` (Windows 11 / pwsh) e §11.2 documentando o webhook de deploy
  manual com referência a `docs/secrets.md` (gitignored).

### Changed

- `@eslint/js` alinhado para `^9.16.0` (mesma série do `eslint` instalado;
  `^10` quebraria `npm ci` no CI por peer-dep).

### Fixed

- Removidas duas diretivas `eslint-disable` órfãs em `src/middlewares/error.ts`
  apontadas pelo `--fix`.
- `tests/setup.ts` não apaga mais o `.db` no `beforeAll`. Com `singleFork: true`
  o `PrismaClient` é singleton entre os arquivos de teste; apagar o arquivo no
  Linux deixava o handle apontando para um inode órfão e o próximo arquivo
  estourava `P2021 The table 'main.User' does not exist`. `migrate deploy` é
  idempotente, então basta deixar a tabela existir entre arquivos — a limpeza
  de dados continua a cargo do `afterEach`. Localmente não aparecia porque o
  OneDrive trava o `rmSync` com `EBUSY` e o `try/catch` engolia o erro.

## [0.1.3] - 2026-05-17

### Fixed

- `tsconfig.build.json` agora declara `rootDir: "src"`. Sem isso, o `tsc`
  herdava `rootDir: "."` do `tsconfig.json` base e gerava `dist/src/server.js`
  em vez de `dist/server.js`, fazendo o container em produção crashar com
  `MODULE_NOT_FOUND: Cannot find module '/app/dist/server.js'` após o
  `prisma migrate deploy`. Também desabilitado `sourceMap` no build de
  produção.

## [0.1.2] - 2026-05-17

### Changed

- Porta padrão do servidor migrada de `3000` para `3050` para evitar conflito
  com serviços internos do EasyPanel. Atualizados `Dockerfile` (`ENV PORT`,
  `EXPOSE`, `HEALTHCHECK`), `src/server.ts`, `.env.example`, `.vscode/tasks.json`,
  `README.md` e `.github/copilot-instructions.md`. **Ação no painel EasyPanel:**
  atualizar `PORT=3050` em Ambiente e o destino do domínio para
  `http://desenvolvimento_web_api-c2:3050/`.

## [0.1.1] - 2026-05-17

### Fixed

- Pinada a dependência `@types/express` em `^4.17.21` (estava em `^5.0.0`, que o
  npm resolvia para 5.0.6 e quebrava o `tsc` no build de produção com
  `TS2322 string | string[]` em `req.params.id`). O runtime usa Express 4.22,
  portanto as tipagens da v5 eram incompatíveis. Erro só aparecia no build do
  Docker (EasyPanel) porque o Vitest transpila via esbuild, sem type-check.

## [0.1.0] - 2026-05-17

### Added

- Scaffold inicial do projeto C2 (API REST de Agendamento de Serviços).
- `package.json` com scripts `dev`, `build`, `start`, `test`, `test:coverage`, `prisma:*`.
- `tsconfig.json` + `tsconfig.build.json` com TypeScript strict e ESM (NodeNext).
- `vitest.config.ts` com cobertura V8 e thresholds de 70% (lines/functions).
- `prisma/schema.prisma` com 4 entidades: `User`, `Professional`, `Service`, `Appointment`.
- `prisma/seed.ts` populando admin + profissional + serviço de exemplo.
- Camada `src/lib`: `prisma.ts` (adapter `better-sqlite3`), `auth.ts` (bcrypt + JWT access/refresh),
  `pagination.ts`, `errors.ts`.
- Middlewares: `authenticate`, `authorize`, `error`.
- Schemas Zod por entidade.
- Rotas: `/auth`, `/users`, `/professionals`, `/services`, `/appointments` com CRUD,
  paginação/busca, soft delete, ownership e role ADMIN.
- Swagger UI servido em `/docs`.
- Testes: 6 unitários (auth helpers + schemas) + 12 de integração (Supertest).
- `Dockerfile` multi-stage com `better-sqlite3` nativo e volume `/app/prisma`.
- `.github/workflows/ci.yml` rodando lint + test:coverage + upload de artefato.
- `.github/workflows/deploy.yml` disparando webhook EasyPanel (secret
  `EASYPANEL_DEPLOY_WEBHOOK_C2`) em push para `master`.
- `.vscode/` com `settings.json`, `tasks.json` e `launch.json` para TS/Vitest.
- `README.md` completo com exemplos curl e instruções de deploy.

### Removed

- Configurações legadas do projeto anterior (Site de Acolhimento FAESA):
  `.vscode/settings.json` (LaTeX Workshop), `.vscode/tasks.json`,
  `.vscode/launch.json` e `.github/workflows/deploy.yml` (webhook antigo).

### Security

- `.gitignore` blindando `docs/secrets.md`, `.env` e `prisma/*.db` antes do primeiro commit.
