# Guia de Testes da API — `curl` e Postman

> Documento de apoio para validar manualmente os endpoints da **API C2 — Agendamento
> de Serviços**. Todos os exemplos são apresentados em `curl` (formato canônico do
> Postman: `File ▸ Import ▸ Raw text` aceita o comando colado) e podem ser
> executados no PowerShell (Windows 11) usando `curl.exe` em vez de `curl` para
> evitar o alias do `Invoke-WebRequest`.

---

## 1. Ambientes

| Ambiente | Base URL                            |
| -------- | ----------------------------------- |
| Local    | `http://localhost:3050`             |
| Produção | `https://api-c2.gmcsistemas.com.br` |

No Postman, crie um **Environment** com a variável `{{baseUrl}}` apontando para
um dos valores acima e duas variáveis vazias `{{accessToken}}` e `{{refreshToken}}`
que serão preenchidas pelo fluxo de login.

Para o `curl` em PowerShell, defina:

```powershell
$baseUrl = 'http://localhost:3050'
$accessToken = ''
$refreshToken = ''
```

---

## 2. Convenções

- **Content-Type:** sempre `application/json` nas requisições com corpo.
- **Autorização:** header `Authorization: Bearer <accessToken>`.
- **Datas:** ISO 8601 (ex.: `2026-06-01T14:00:00.000Z`).
- **IDs:** strings (CUID gerados pelo Prisma).
- **Paginação:** query string `?page=1&limit=10&search=<termo>`.
- **Soft delete:** `DELETE` devolve `204 No Content` e o recurso some das listas.
- **Status HTTP:** 200/201/204 sucesso · 400 regra de negócio · 401 sem/invalido
  token · 403 sem permissão · 404 não encontrado · 409 conflito · 422 Zod.

---

## 3. Health check

```bash
curl -i {{baseUrl}}/healthz
```

Resposta esperada `200`:

```json
{ "status": "ok", "service": "api-c2-agendamento" }
```

---

## 4. Documentação interativa (Swagger)

Abrir no navegador: `{{baseUrl}}/docs` — referência completa de schemas e
parâmetros gerada a partir do `src/swagger.ts`.

---

## 5. Auth (`/auth`)

### 5.1 Registrar usuário comum

```bash
curl -i -X POST {{baseUrl}}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@example.com",
    "name": "Ana Souza",
    "password": "senhaForte123"
  }'
```

`201 Created` → `{ id, email, name, role: "USER" }`.

### 5.2 Login

```bash
curl -i -X POST {{baseUrl}}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@example.com",
    "password": "senhaForte123"
  }'
```

`200 OK` →

```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "USER" },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**No Postman**, adicionar este script na aba _Tests_ da request de login para
persistir os tokens automaticamente:

```js
const body = pm.response.json();
pm.environment.set("accessToken", body.accessToken);
pm.environment.set("refreshToken", body.refreshToken);
```

### 5.3 Refresh

```bash
curl -i -X POST {{baseUrl}}/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "{{refreshToken}}" }'
```

`200 OK` devolve novo par `accessToken`/`refreshToken`.

### 5.4 Perfil autenticado

```bash
curl -i {{baseUrl}}/auth/me \
  -H "Authorization: Bearer {{accessToken}}"
```

`200 OK` → dados do próprio usuário.

---

## 6. Usuários (`/users`)

> Todos os endpoints exigem autenticação. Listar é privilégio **ADMIN**.

### 6.1 Listar (somente ADMIN)

```bash
curl -i "{{baseUrl}}/users?page=1&limit=10&search=ana" \
  -H "Authorization: Bearer {{accessToken}}"
```

`200 OK` → envelope `{ data, total, page, limit, totalPages }`.

### 6.2 Detalhar (próprio usuário ou ADMIN)

```bash
curl -i {{baseUrl}}/users/<USER_ID> \
  -H "Authorization: Bearer {{accessToken}}"
```

### 6.3 Soft delete (próprio usuário ou ADMIN)

```bash
curl -i -X DELETE {{baseUrl}}/users/<USER_ID> \
  -H "Authorization: Bearer {{accessToken}}"
```

`204 No Content`.

---

## 7. Profissionais (`/professionals`)

### 7.1 Listar (público, paginado)

```bash
curl -i "{{baseUrl}}/professionals?page=1&limit=10&search=corte"
```

### 7.2 Detalhar (público, com serviços incluídos)

```bash
curl -i {{baseUrl}}/professionals/<PROFESSIONAL_ID>
```

### 7.3 Criar perfil profissional (autenticado, 1 por usuário)

```bash
curl -i -X POST {{baseUrl}}/professionals \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "specialty": "Barbeiro",
    "bio": "10 anos de experiência em cortes masculinos."
  }'
```

`201 Created` → guarde `id` em `{{professionalId}}`. Tentar criar um segundo
para o mesmo usuário devolve `409 Conflict`.

### 7.4 Atualizar (dono ou ADMIN)

```bash
curl -i -X PATCH {{baseUrl}}/professionals/<PROFESSIONAL_ID> \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{ "bio": "Atualização da bio" }'
```

### 7.5 Soft delete (dono ou ADMIN)

```bash
curl -i -X DELETE {{baseUrl}}/professionals/<PROFESSIONAL_ID> \
  -H "Authorization: Bearer {{accessToken}}"
```

---

## 8. Serviços (`/services`)

### 8.1 Listar (público)

```bash
curl -i "{{baseUrl}}/services?page=1&limit=10&search=corte"
```

### 8.2 Detalhar (público)

```bash
curl -i {{baseUrl}}/services/<SERVICE_ID>
```

### 8.3 Criar (autenticado; requer perfil profissional)

```bash
curl -i -X POST {{baseUrl}}/services \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corte masculino",
    "description": "Tesoura + máquina + finalização",
    "durationMin": 45,
    "priceCents": 5000
  }'
```

`201 Created`. Se o usuário não for profissional, devolve `400 Bad Request`
com `"Usuário não possui perfil profissional"`.

### 8.4 Atualizar (dono via `professional.userId` ou ADMIN)

```bash
curl -i -X PATCH {{baseUrl}}/services/<SERVICE_ID> \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{ "priceCents": 6000 }'
```

### 8.5 Soft delete (dono ou ADMIN)

```bash
curl -i -X DELETE {{baseUrl}}/services/<SERVICE_ID> \
  -H "Authorization: Bearer {{accessToken}}"
```

---

## 9. Agendamentos (`/appointments`)

> Todos os endpoints exigem autenticação. Usuário comum só vê os próprios;
> ADMIN vê tudo.

### 9.1 Listar

```bash
curl -i "{{baseUrl}}/appointments?page=1&limit=10" \
  -H "Authorization: Bearer {{accessToken}}"
```

### 9.2 Detalhar

```bash
curl -i {{baseUrl}}/appointments/<APPOINTMENT_ID> \
  -H "Authorization: Bearer {{accessToken}}"
```

### 9.3 Criar

```bash
curl -i -X POST {{baseUrl}}/appointments \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "<SERVICE_ID>",
    "scheduledAt": "2026-06-01T14:00:00.000Z",
    "notes": "Preferência por cadeira da janela"
  }'
```

Regras:

- `serviceId` deve existir e não estar soft-deletado → senão `400`.
- `scheduledAt` precisa ser **no futuro** → senão `400 "scheduledAt deve estar no futuro"`.

### 9.4 Atualizar (dono ou ADMIN)

`status` aceita: `SCHEDULED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.

```bash
curl -i -X PATCH {{baseUrl}}/appointments/<APPOINTMENT_ID> \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "CONFIRMED" }'
```

### 9.5 Cancelar (soft delete)

```bash
curl -i -X DELETE {{baseUrl}}/appointments/<APPOINTMENT_ID> \
  -H "Authorization: Bearer {{accessToken}}"
```

Marca `deletedAt` e seta `status = "CANCELLED"`. Devolve `204 No Content`.

---

## 10. Fluxo ponta-a-ponta sugerido (smoke test)

Sequência mínima que exercita as 4 entidades:

1. `POST /auth/register` — cria usuário `ana`.
2. `POST /auth/login` — captura `accessToken` (Ana).
3. `POST /professionals` — Ana vira profissional.
4. `POST /services` — Ana cadastra "Corte masculino".
5. `POST /auth/register` — cria segundo usuário `bruno`.
6. `POST /auth/login` — captura `accessToken` (Bruno).
7. `GET  /services` — Bruno descobre o serviço criado.
8. `POST /appointments` — Bruno agenda com Ana.
9. `GET  /appointments` — Bruno vê o próprio; Ana (com seu token) **não** vê
   (a menos que seja ADMIN).
10. `PATCH /appointments/:id` — Bruno marca como `CANCELLED`.
11. `DELETE /appointments/:id` — soft delete.

---

## 11. Importando no Postman

Duas alternativas:

1. **OpenAPI:** `File ▸ Import ▸ Link` colando `{{baseUrl}}/docs/openapi.json`
   (ou copiando o JSON do `src/swagger.ts`). Postman gera coleção e schemas
   automaticamente.
2. **curl avulso:** copiar qualquer bloco `curl` deste documento, abrir Postman
   em `File ▸ Import ▸ Raw text`, colar e clicar em _Continue_. Cada comando
   vira uma request individual.

Após importar, criar o _Environment_ descrito em §1 e o script de captura de
tokens descrito em §5.2 para encadear as chamadas sem editar headers à mão.

---

## 12. Erros comuns

| Sintoma                                         | Causa provável                                |
| ----------------------------------------------- | --------------------------------------------- |
| `401 Token inválido ou ausente`                 | Esqueceu `Authorization: Bearer …`            |
| `403 Acesso negado`                             | Token válido, mas rota exige ADMIN ou owner   |
| `422 Validation error` (lista de issues do Zod) | Body fora do schema (tipo/obrigatoriedade)    |
| `409 E-mail já cadastrado`                      | Reusou e-mail no `POST /auth/register`        |
| `409 Usuário já possui perfil profissional`     | 2º `POST /professionals` para o mesmo usuário |
| `400 Serviço inválido`                          | `serviceId` inexistente ou soft-deletado      |
| `400 scheduledAt deve estar no futuro`          | Data no passado ou igual ao instante atual    |
| `curl: (3) URL using bad/illegal format`        | PowerShell interpretou `curl` como alias      |
|                                                 | → usar `curl.exe`                             |
