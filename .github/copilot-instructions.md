# GitHub Copilot — Instruções do Repositório

> Instruções do projeto **API C2 — Agendamento de Serviços** (Faesa).
> Leia este arquivo completamente antes de sugerir qualquer alteração.

---

## 0. Diretrizes Críticas

1. **Trabalho acadêmico individual (C2 — 10,0 pts)** — Prof. Otávio Lube. Plágio zera. Uso de
   IA é permitido **desde que o aluno saiba explicar cada parte** em prova oral.
2. **Stack obrigatória do enunciado é INALIENÁVEL:** Node 20+ TS, Express, Prisma + adapter
   `better-sqlite3`, **SQLite**, JWT + bcrypt, **Zod**, Vitest + Supertest, ≥70 % de cobertura.
   **Não introduzir Postgres, Supabase, Vercel, MongoDB ou qualquer banco alternativo.**
3. **Postura zero-fluff:** tutor estrito, técnico e formal. Sem analogias, sem validações
   emocionais, sem "Peço desculpas". Causa-raiz formal → solução direta.
4. **Segredos:** `docs/secrets.md` e `.env` **NUNCA** podem entrar em commit. Verificar com
   `git check-ignore -v` antes de qualquer `git add`.

---

## 1. Visão geral

API REST em Node 20 + TypeScript (ESM) para um sistema de **agendamento de serviços**.

Entidades: `User` (USER/ADMIN), `Professional`, `Service`, `Appointment`.
Todas com `deletedAt` (soft delete).

Endpoints em `http://localhost:3000`. Swagger em `/docs`. Health em `/healthz`.

---

## 2. Ambiente de Desenvolvimento

| Item               | Detalhe                                 |
| ------------------ | --------------------------------------- |
| SO                 | Windows 11                              |
| Shell              | PowerShell (`pwsh`)                     |
| Editor             | VS Code                                 |
| Node               | >= 20                                   |
| Gestor de pacotes  | npm                                     |
| Banco local        | `prisma/dev.db` (SQLite, gitignored)    |
| Repositório remoto | GitHub (ainda não inicializado)         |
| Deploy             | EasyPanel — `api-c2.gmcsistemas.com.br` |

Comandos básicos (PowerShell):

```powershell
npm install
Copy-Item .env.example .env
npx prisma migrate dev --name init
npm run dev               # http://localhost:3000
npm test
npm run test:coverage
```

---

## 3. Estrutura

```
.
├── prisma/{schema.prisma, seed.ts, migrations/}
├── src/
│   ├── lib/{prisma,auth,pagination,errors}.ts
│   ├── middlewares/{authenticate,authorize,error}.ts
│   ├── schemas/{auth,professional,service,appointment}.ts
│   ├── routes/{auth,users,professionals,services,appointments}.ts
│   ├── app.ts            # createApp() — usado pelos testes
│   ├── server.ts         # bootstrap
│   └── swagger.ts        # spec OpenAPI 3.0 em /docs
├── tests/{setup.ts, unit/, integration/}
├── .github/workflows/{ci.yml, deploy.yml}
├── .vscode/{settings,tasks,launch}.json
├── docs/
│   ├── secrets.md        # GITIGNORED
│   └── plano-*.md
├── Dockerfile .dockerignore .gitignore .env.example
├── package.json tsconfig*.json vitest.config.ts
├── README.md CHANGELOG.md
```

---

## 4. Padrões de Código

- **TypeScript strict.** Sem `any` implícito.
- **ESM** (`"type": "module"`). **Imports relativos terminam em `.js`** (NodeNext) —
  ex: `import { prisma } from './lib/prisma.js'`.
- Indentação 2 espaços. Linha máx. 100 colunas.
- Validação via Zod sempre. Nunca confiar em `req.body` sem `parse()`.
- Erros: lançar `HttpError` (`src/lib/errors.ts`) ou deixar Zod estourar; `errorHandler`
  global converte para JSON.
- Senhas nunca em respostas. Use `toPublicUser` ou `select` no Prisma.
- Soft delete: filtrar `deletedAt: null` em leituras.
- Idioma das mensagens e logs: **pt-BR**.

### Status HTTP

| Status      | Quando                          |
| ----------- | ------------------------------- |
| 200/201/204 | GET / POST / DELETE com sucesso |
| 400         | Regra de negócio violada        |
| 401         | Sem token ou token inválido     |
| 403         | Autenticado mas sem permissão   |
| 404         | Recurso não encontrado          |
| 409         | Conflito (ex: e-mail duplicado) |
| 422         | Erro de validação (Zod)         |

---

## 5. Testes

- Vitest + Supertest, banco isolado em `prisma/test.db` (`migrate deploy` em `beforeAll`).
- `tests/setup.ts` define env e limpa tabelas em `afterEach`.
- Mínimos: ≥5 unit + ≥10 integração + ≥70 % cobertura.
- Thresholds em `vitest.config.ts` — build falha se cair.

```powershell
npm run test:coverage
```

---

## 6. Comportamento do Agente

- Direto, técnico, sem fluff. Sem analogias, sem "Peço desculpas".
- Critique código mal estruturado com objetividade.
- Não over-engineer: só o que foi pedido. Não adicione comentários a código já existente.

### 6.1 Antes de propor solução

1. "A causa-raiz é..."
2. "Os arquivos afetados são..."
3. "A correção:" (código).

---

## 7. Pesquisas

- Verificar data atual antes de pesquisar.
- Priorizar docs oficiais (`prisma.io`, `expressjs.com`, `vitest.dev`, `zod.dev`).
- Classificar fontes: `[Alta]`/`[Média]`/`[Baixa]`.

---

## 8. Planos de Ação

Mudanças com **3+ etapas** → criar `docs/plano-YYYY-MM-DD-<slug>.md` e aguardar confirmação.
Estrutura: Objetivo, Etapas (checkboxes), Impacto, Riscos, Critério de Conclusão.

---

## 9. Commits — Conventional Commits

Formato: `<tipo>(escopo): <descrição imperativa em pt-BR>`
Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`, `ci`, `revert`.

### 9.1 Atomicidade

- Um commit = uma intenção. Se a frase precisa de "e", divida.
- Corpo explicando o _porquê_ em commits não triviais.
- `git status` + `git diff --stat` antes de commitar.
- Mensagens em pt-BR.

### 9.2 Bump de versão

Mudanças de comportamento exigem, no mesmo commit:

1. SemVer no `package.json`.
2. Mover `[Unreleased]` para nova seção no `CHANGELOG.md`.

Mudanças só em `docs/` não exigem bump.

---

## 10. README e CHANGELOG

- README: atualizar quando mudar endpoints, stack, scripts ou deploy.
- CHANGELOG: Keep a Changelog 1.1.0 — `Added`/`Changed`/`Deprecated`/`Removed`/`Fixed`/`Security`.
  Datas ISO 8601.

---

## 11. CI / Deploy

- **CI** (`.github/workflows/ci.yml`): em push/PR roda `npm ci`, `prisma generate`,
  `lint`, `test:coverage`.
- **Deploy** (`.github/workflows/deploy.yml`): push em `master` → POST no webhook
  `EASYPANEL_DEPLOY_WEBHOOK_C2`.
- Pós-deploy: `curl https://api-c2.gmcsistemas.com.br/healthz`.

### 11.1 Volume persistente no EasyPanel

Serviço deve montar volume em `/app/prisma` — senão cada redeploy zera o `dev.db`.

---

## 12. Diretrizes Gerais

- Idioma pt-BR em tudo (código, comentários, mensagens, commits, docs).
- Aluno único: Gabriel Malheiros de Castro.
- Não criar arquivos desnecessários.
- UTF-8 sem BOM.
- Imports ESM com `.js` mesmo em `.ts` (NodeNext).
- Sem `console.log` em produção — só em `server.ts` (bootstrap) e `error.ts` (handler).
