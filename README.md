# API C2 — Agendamento de Serviços

> Trabalho prático da **Composição 2 (C2)** — Disciplina: Desenvolvimento de Aplicações Web II
> · Faesa Campus Vitória · Aluno: **Gabriel Malheiros de Castro** · Prof. Otávio Lube.

API REST completa em Node.js + TypeScript para um sistema de **agendamento de serviços**
(cliente marca horários com profissionais que oferecem serviços).

- **Produção:** <https://api-c2.gmcsistemas.com.br> · Swagger em [`/docs`](https://api-c2.gmcsistemas.com.br/docs) · Health em [`/healthz`](https://api-c2.gmcsistemas.com.br/healthz)
- **CI:** GitHub Actions (`ci.yml`) roda `lint + typecheck + build + test:coverage` em cada push.
- **Deploy:** push em `master` aciona `deploy.yml` → webhook EasyPanel → rebuild do container.

## Informações acadêmicas

| Item       | Valor                                          |
| ---------- | ---------------------------------------------- |
| Disciplina | Desenvolvimento de Aplicações Web II (D001508) |
| Avaliação  | Composição 2 — Individual — 10,0 pts           |
| Docente    | Prof. Otávio Lube                              |
| Aluno      | Gabriel Malheiros de Castro                    |
| Semestre   | 2026/1                                         |

## Domínio e entidades

| Entidade       | Descrição                                                                      |
| -------------- | ------------------------------------------------------------------------------ |
| `User`         | Usuário do sistema. Papéis: `USER`, `ADMIN`. Pode ser cliente ou profissional. |
| `Professional` | Perfil profissional vinculado 1:1 a um `User`. Oferece serviços.               |
| `Service`      | Serviço oferecido por um `Professional` (nome, duração, preço).                |
| `Appointment`  | Agendamento de um `User` para um `Service` em uma data/hora.                   |

Todas as entidades possuem `deletedAt` (soft delete).

## Stack

| Camada    | Tecnologia                                       |
| --------- | ------------------------------------------------ |
| Runtime   | Node.js 20+ (ESM)                                |
| Linguagem | TypeScript 5 (strict)                            |
| HTTP      | Express 4                                        |
| ORM       | Prisma 6 + adapter `better-sqlite3`              |
| Banco     | SQLite (arquivo local versionado via migrations) |
| Auth      | JWT (`jsonwebtoken`) + bcrypt                    |
| Validação | Zod                                              |
| Testes    | Vitest + Supertest (cobertura V8, mínimo 70%)    |
| Lint      | ESLint 9 (flat config) + `@typescript-eslint`    |
| Docs      | Swagger UI (`/docs`)                             |
| Deploy    | Docker + EasyPanel (volume persistente)          |

## Pré-requisitos

- Node.js >= 20
- npm >= 10
- (Windows) build tools para compilar `better-sqlite3` — geralmente OK com Node 20

## Como rodar localmente

```powershell
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
Copy-Item .env.example .env

# 3. Aplicar migrations e gerar o client Prisma
npx prisma migrate dev --name init

# 4. (opcional) Popular dados de exemplo
npm run prisma:seed

# 5. Subir o servidor em modo dev (watch)
npm run dev
```

Servidor: <http://localhost:3050> · Swagger: <http://localhost:3050/docs>

## Testes

```powershell
# Roda todos os testes
npm test

# Com relatório de cobertura (HTML em ./coverage/index.html)
npm run test:coverage
```

A suíte cobre helpers de auth, schemas Zod, fluxo completo de registro/login,
ownership, autorização por papel (`ADMIN`) e CRUD de serviços/agendamentos.

### Cobertura atual (≥ 70 % exigido pelo enunciado)

| Métrica    | Total | Cobertos | %           |
| ---------- | ----- | -------- | ----------- |
| Linhas     | 571   | 512      | **89,66 %** |
| Statements | 571   | 512      | **89,66 %** |
| Funções    | 21    | 20       | **95,23 %** |
| Branches   | 124   | 86       | **69,35 %** |

Contagem: **12 testes unitários** (`tests/unit/`) + **30 testes de integração**
(`tests/integration/`) = **42 testes**, todos passando.

Fonte: [coverage/coverage-summary.json](coverage/coverage-summary.json). Relatório
HTML navegável em [coverage/index.html](coverage/index.html). Screenshot do
terminal (entregável obrigatório §7.4 do enunciado): [docs/coverage.png](docs/coverage.png).

> Para regenerar o print: rode `npm run test:coverage` no PowerShell, tire
> screenshot da tabela final e salve em `docs/coverage.png`.

### Coleção de requisições (entregável §7.5 do enunciado)

Arquivo [docs/api.http](docs/api.http) com o fluxo completo de \*\*autenticação

- CRUD\*\* das 4 entidades, incluindo cenários de erro (401, 403, 404, 409, 422).
  Formatos suportados:

* **VS Code** — instale a extensão `humao.rest-client` e clique em `Send Request`
  acima de cada bloco.
* **Postman / Insomnia** — `Import → Raw text → HTTP` colando o conteúdo do
  arquivo, ou importe direto pelo caminho do arquivo `.http`.

As variáveis `@userToken`, `@adminToken`, `@professionalId`, `@serviceId` e
`@appointmentId` são capturadas automaticamente das respostas anteriores.

### Checklist pré-push (obrigatório)

O Vitest usa esbuild e não faz type-check real; o único modo de pegar
regressões antes do build Docker do EasyPanel é rodar o `tsc` localmente:

```powershell
npm run verify   # = typecheck + build + test:coverage
npm run lint     # ESLint 9 flat config
```

Detalhes completos do checklist (incluindo sanity-check com
`node dist/server.js`) em [.github/copilot-instructions.md](.github/copilot-instructions.md) §5.1.

## Endpoints principais

| Método   | Rota                 | Auth                    | Descrição                                        |
| -------- | -------------------- | ----------------------- | ------------------------------------------------ |
| `POST`   | `/auth/register`     | —                       | Cria conta                                       |
| `POST`   | `/auth/login`        | —                       | Retorna `accessToken` + `refreshToken`           |
| `POST`   | `/auth/refresh`      | —                       | Renova tokens                                    |
| `GET`    | `/auth/me`           | Bearer                  | Dados do usuário autenticado                     |
| `GET`    | `/users`             | ADMIN                   | Lista usuários (paginado)                        |
| `GET`    | `/users/:id`         | ownership/ADMIN         | Detalhes                                         |
| `DELETE` | `/users/:id`         | ownership/ADMIN         | Soft delete                                      |
| `GET`    | `/professionals`     | —                       | Lista pública (com `?search=` por especialidade) |
| `GET`    | `/professionals/:id` | —                       | Inclui serviços do profissional                  |
| `POST`   | `/professionals`     | Bearer                  | Cria perfil profissional (1 por usuário)         |
| `PATCH`  | `/professionals/:id` | ownership/ADMIN         | Atualiza                                         |
| `DELETE` | `/professionals/:id` | ownership/ADMIN         | Soft delete                                      |
| `GET`    | `/services`          | —                       | Lista pública (paginado)                         |
| `GET`    | `/services/:id`      | —                       | Detalhe com `include` do profissional            |
| `POST`   | `/services`          | Bearer (com perfil pro) | Cria serviço                                     |
| `PATCH`  | `/services/:id`      | ownership/ADMIN         | Atualiza                                         |
| `DELETE` | `/services/:id`      | ownership/ADMIN         | Soft delete                                      |
| `GET`    | `/appointments`      | Bearer                  | Próprios (USER) ou todos (ADMIN)                 |
| `GET`    | `/appointments/:id`  | ownership/ADMIN         | Detalhes                                         |
| `POST`   | `/appointments`      | Bearer                  | Cria agendamento futuro                          |
| `PATCH`  | `/appointments/:id`  | ownership/ADMIN         | Atualiza status/nota/data                        |
| `DELETE` | `/appointments/:id`  | ownership/ADMIN         | Cancela (soft delete)                            |

### Exemplos curl

```bash
# Registro
curl -X POST http://localhost:3050/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@x.com","name":"Ana","password":"senha12345"}'

# Login
curl -X POST http://localhost:3050/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@x.com","password":"senha12345"}'

# Listar serviços
curl 'http://localhost:3050/services?page=1&limit=10&search=psico'

# Criar agendamento (TOKEN = accessToken do login)
curl -X POST http://localhost:3050/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"serviceId":"<id>","scheduledAt":"2026-12-01T14:00:00Z"}'
```

## Pontos extras implementados (+1,0)

- [x] Paginação e busca (`?page=&limit=&search=`)
- [x] Soft delete em todas as entidades
- [x] Refresh tokens (`/auth/refresh`)
- [x] CI no GitHub Actions rodando Vitest + cobertura
- [x] OpenAPI/Swagger servido em `/docs`

## Entregáveis (mapeamento com o enunciado do Prof. Otávio Lube)

Referência: `docs/Projeto Prático da C2 — API REST Completa (Individual).html`.

### Requisitos técnicos obrigatórios (Parte 2)

| Item                                              | Status | Onde                                                                                 |
| ------------------------------------------------- | :----: | ------------------------------------------------------------------------------------ |
| Node.js 20+ com TypeScript (ESM)                  |   ✅   | [package.json](package.json), [tsconfig.json](tsconfig.json)                         |
| Express.js                                        |   ✅   | [src/app.ts](src/app.ts)                                                             |
| Prisma com adapter `better-sqlite3`               |   ✅   | [prisma/schema.prisma](prisma/schema.prisma), [src/lib/prisma.ts](src/lib/prisma.ts) |
| SQLite versionado via migrations                  |   ✅   | [prisma/migrations/](prisma/migrations/)                                             |
| JWT (`jsonwebtoken`) + bcrypt                     |   ✅   | [src/lib/auth.ts](src/lib/auth.ts)                                                   |
| Autorização ≥ 2 papéis (USER, ADMIN) + ownership  |   ✅   | [src/middlewares/authorize.ts](src/middlewares/authorize.ts) + rotas                 |
| Validação Zod em todas as rotas de escrita        |   ✅   | [src/schemas/](src/schemas/)                                                         |
| Vitest + Supertest com banco de testes isolado    |   ✅   | [tests/setup.ts](tests/setup.ts), `prisma/test.db`                                   |
| Cobertura mínima 70 % linhas e funções            |   ✅   | **89,66 %** linhas / **95,23 %** funções                                             |
| Repositório no GitHub com histórico significativo |   ✅   | Conventional Commits + [CHANGELOG.md](CHANGELOG.md)                                  |

### Funcionalidades obrigatórias (Parte 3)

| Item                                                          | Status | Onde                                                                                         |
| ------------------------------------------------------------- | :----: | -------------------------------------------------------------------------------------------- |
| `POST /auth/register` (senha hasheada)                        |   ✅   | [src/routes/auth.ts](src/routes/auth.ts)                                                     |
| `POST /auth/login` (devolve JWT)                              |   ✅   | [src/routes/auth.ts](src/routes/auth.ts)                                                     |
| `GET /auth/me`                                                |   ✅   | [src/routes/auth.ts](src/routes/auth.ts)                                                     |
| Senha nunca aparece em respostas (`toPublicUser` / select)    |   ✅   | [src/routes/auth.ts](src/routes/auth.ts), [src/routes/users.ts](src/routes/users.ts)         |
| CRUD completo (POST/GET/GET id/PATCH/DELETE) em cada entidade |   ✅   | [src/routes/](src/routes/)                                                                   |
| Status codes corretos (200/201/204/400/401/403/404/409/422)   |   ✅   | [src/lib/errors.ts](src/lib/errors.ts), [src/middlewares/error.ts](src/middlewares/error.ts) |
| Pelo menos uma rota com relacionamento (`include` no Prisma)  |   ✅   | `GET /professionals/:id`, `GET /services/:id`, `GET /appointments`                           |
| Pelo menos uma operação restrita a ADMIN                      |   ✅   | `GET /users` (`authorize('ADMIN')`)                                                          |
| Pelo menos uma operação com ownership (só o dono edita/apaga) |   ✅   | `PATCH/DELETE` em users, professionals, services, appointments                               |

### Testes obrigatórios (Parte 5)

| Cenário                                                | Status | Arquivo                                                                                                                                            |
| ------------------------------------------------------ | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hash diferente do plaintext + verify correto/incorreto |   ✅   | [tests/unit/auth.test.ts](tests/unit/auth.test.ts)                                                                                                 |
| Sign + decode de token preserva payload                |   ✅   | [tests/unit/auth.test.ts](tests/unit/auth.test.ts)                                                                                                 |
| Schemas Zod (inputs válidos e inválidos)               |   ✅   | [tests/unit/schemas.test.ts](tests/unit/schemas.test.ts)                                                                                           |
| Registro com sucesso e falha (duplicado, senha curta)  |   ✅   | [tests/integration/auth.test.ts](tests/integration/auth.test.ts)                                                                                   |
| Login com sucesso e falha (credencial inválida)        |   ✅   | [tests/integration/auth.test.ts](tests/integration/auth.test.ts)                                                                                   |
| Sem token em rota protegida → 401                      |   ✅   | [tests/integration/auth.test.ts](tests/integration/auth.test.ts), [tests/integration/appointments.test.ts](tests/integration/appointments.test.ts) |
| CRUD completo de pelo menos uma entidade               |   ✅   | [tests/integration/appointments.test.ts](tests/integration/appointments.test.ts)                                                                   |
| USER tenta acessar rota ADMIN → 403                    |   ✅   | [tests/integration/auth.test.ts](tests/integration/auth.test.ts) (`GET /users`)                                                                    |
| USER tenta editar recurso de outro USER → 403          |   ✅   | [tests/integration/appointments.test.ts](tests/integration/appointments.test.ts)                                                                   |
| Mínimo: 5 unit + 10 integration                        |   ✅   | 12 unit + 30 integration                                                                                                                           |

### Entregáveis (Parte 7)

| Item                                                                    | Status | Onde                                   |
| ----------------------------------------------------------------------- | :----: | -------------------------------------- |
| Link do repositório público no GitHub                                   |   ✅   | enviar via _Envio de Trabalhos_        |
| README com domínio, entidades, instalação, exemplos e como rodar testes |   ✅   | este arquivo                           |
| `.env.example` documentando variáveis (sem segredos reais)              |   ✅   | [.env.example](.env.example)           |
| Print do relatório de cobertura                                         |   ✅   | [docs/coverage.png](docs/coverage.png) |
| Coleção Postman/Insomnia ou arquivo `.http`                             |   ✅   | [docs/api.http](docs/api.http)         |

## Deploy (EasyPanel)

Imagem Docker multi-stage. O serviço no EasyPanel deve:

1. Apontar para este repositório, branch `master`, Dockerfile na raiz.
2. Expor a porta `3050`.
3. Montar um **volume persistente** em `/app/prisma` (onde fica o `dev.db`).
4. Definir as variáveis de ambiente do `.env.example`.
5. Configurar o domínio `api-c2.gmcsistemas.com.br` no Traefik.
6. Gerar webhook e cadastrar como GitHub Secret `EASYPANEL_DEPLOY_WEBHOOK_C2`.

Push em `master` dispara `.github/workflows/deploy.yml`, que aciona o webhook.
O workflow ignora `docs/**`, `*.md` e `.vscode/**` para evitar redeploys
desnecessários. Redeploy manual: aba **Actions** ▸ **Deploy to EasyPanel** ▸
**Run workflow**.

Pós-deploy:

```powershell
curl https://api-c2.gmcsistemas.com.br/healthz
```

## Estrutura do projeto

```
.
├── prisma/
│   ├── schema.prisma         # User, Professional, Service, Appointment
│   ├── seed.ts               # Admin + profissional + serviço de exemplo
│   └── migrations/
├── src/
│   ├── lib/                  # prisma, auth, pagination, errors
│   ├── middlewares/          # authenticate, authorize, error
│   ├── schemas/              # validações Zod
│   ├── routes/               # auth, users, professionals, services, appointments
│   ├── app.ts                # createApp() — usado pelos testes
│   ├── server.ts             # bootstrap (app.listen)
│   └── swagger.ts            # spec OpenAPI 3.0
├── tests/
│   ├── setup.ts              # DATABASE_URL de teste + migrate + cleanup
│   ├── unit/                 # auth helpers + schemas Zod
│   └── integration/          # auth + CRUD via Supertest
├── .github/workflows/        # ci.yml + deploy.yml
├── eslint.config.js          # flat config ESLint 9 + @typescript-eslint
├── Dockerfile
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Licença

Uso acadêmico — Faesa 2026.
