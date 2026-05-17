# API C2 — Agendamento de Serviços

> Trabalho prático da **Composição 2 (C2)** — Disciplina: Desenvolvimento de Aplicações Web II
> · Faesa Campus Vitória · Aluno: **Gabriel Malheiros de Castro** · Prof. Otávio Lube.

API REST completa em Node.js + TypeScript para um sistema de **agendamento de serviços**
(cliente marca horários com profissionais que oferecem serviços).

## Informações acadêmicas

| Item | Valor |
|---|---|
| Disciplina | Desenvolvimento de Aplicações Web II (D001508) |
| Avaliação | Composição 2 — Individual — 10,0 pts |
| Docente | Prof. Otávio Lube |
| Aluno | Gabriel Malheiros de Castro |
| Semestre | 2026/1 |

## Domínio e entidades

| Entidade | Descrição |
|---|---|
| `User` | Usuário do sistema. Papéis: `USER`, `ADMIN`. Pode ser cliente ou profissional. |
| `Professional` | Perfil profissional vinculado 1:1 a um `User`. Oferece serviços. |
| `Service` | Serviço oferecido por um `Professional` (nome, duração, preço). |
| `Appointment` | Agendamento de um `User` para um `Service` em uma data/hora. |

Todas as entidades possuem `deletedAt` (soft delete).

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Linguagem | TypeScript 5 (strict) |
| HTTP | Express 4 |
| ORM | Prisma 6 + adapter `better-sqlite3` |
| Banco | SQLite (arquivo local versionado via migrations) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Validação | Zod |
| Testes | Vitest + Supertest (cobertura V8, mínimo 70%) |
| Docs | Swagger UI (`/docs`) |
| Deploy | Docker + EasyPanel (volume persistente) |

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

Servidor: <http://localhost:3000> · Swagger: <http://localhost:3000/docs>

## Testes

```powershell
# Roda todos os testes
npm test

# Com relatório de cobertura (HTML em ./coverage/index.html)
npm run test:coverage
```

A suíte cobre helpers de auth, schemas Zod, fluxo completo de registro/login,
ownership, autorização por papel (`ADMIN`) e CRUD de serviços/agendamentos.

## Endpoints principais

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | — | Cria conta |
| `POST` | `/auth/login` | — | Retorna `accessToken` + `refreshToken` |
| `POST` | `/auth/refresh` | — | Renova tokens |
| `GET` | `/auth/me` | Bearer | Dados do usuário autenticado |
| `GET` | `/users` | ADMIN | Lista usuários (paginado) |
| `GET` | `/users/:id` | ownership/ADMIN | Detalhes |
| `DELETE` | `/users/:id` | ownership/ADMIN | Soft delete |
| `GET` | `/professionals` | — | Lista pública (com `?search=` por especialidade) |
| `GET` | `/professionals/:id` | — | Inclui serviços do profissional |
| `POST` | `/professionals` | Bearer | Cria perfil profissional (1 por usuário) |
| `PATCH` | `/professionals/:id` | ownership/ADMIN | Atualiza |
| `DELETE` | `/professionals/:id` | ownership/ADMIN | Soft delete |
| `GET` | `/services` | — | Lista pública (paginado) |
| `GET` | `/services/:id` | — | Detalhe com `include` do profissional |
| `POST` | `/services` | Bearer (com perfil pro) | Cria serviço |
| `PATCH` | `/services/:id` | ownership/ADMIN | Atualiza |
| `DELETE` | `/services/:id` | ownership/ADMIN | Soft delete |
| `GET` | `/appointments` | Bearer | Próprios (USER) ou todos (ADMIN) |
| `GET` | `/appointments/:id` | ownership/ADMIN | Detalhes |
| `POST` | `/appointments` | Bearer | Cria agendamento futuro |
| `PATCH` | `/appointments/:id` | ownership/ADMIN | Atualiza status/nota/data |
| `DELETE` | `/appointments/:id` | ownership/ADMIN | Cancela (soft delete) |

### Exemplos curl

```bash
# Registro
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@x.com","name":"Ana","password":"senha12345"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@x.com","password":"senha12345"}'

# Listar serviços
curl 'http://localhost:3000/services?page=1&limit=10&search=psico'

# Criar agendamento (TOKEN = accessToken do login)
curl -X POST http://localhost:3000/appointments \
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

## Deploy (EasyPanel)

Imagem Docker multi-stage. O serviço no EasyPanel deve:

1. Apontar para este repositório, branch `master`, Dockerfile na raiz.
2. Expor a porta `3000`.
3. Montar um **volume persistente** em `/app/prisma` (onde fica o `dev.db`).
4. Definir as variáveis de ambiente do `.env.example`.
5. Configurar o domínio `api-c2.gmcsistemas.com.br` no Traefik.
6. Gerar webhook e cadastrar como GitHub Secret `EASYPANEL_DEPLOY_WEBHOOK_C2`.

Push em `master` dispara `.github/workflows/deploy.yml`, que aciona o webhook.

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
├── Dockerfile
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Licença

Uso acadêmico — Faesa 2026.
