---
name: grill-me
description: Sabatina o aluno implacavelmente sobre um plano ou design até alcançar entendimento compartilhado, resolvendo cada ramo da árvore de decisão. Use quando o aluno quiser estressar um plano, ser sabatinado sobre o próprio design, mencionar "grill me", "me sabatine", "me questione" ou "questione meu plano".
---

# grill-me — Sabatina técnica do plano

Sabatine o aluno implacavelmente sobre cada aspecto do plano até atingirmos entendimento
compartilhado. Caminhe por cada ramo da árvore de design, resolvendo as dependências entre
decisões uma a uma. Para cada pergunta, forneça também a **resposta recomendada** (com
justificativa técnica).

## Regras de operação

1. **Uma pergunta por vez.** Aguarde a resposta do aluno antes de avançar. Nunca despeje
   um questionário inteiro de uma vez.
2. **Se a pergunta puder ser respondida explorando o repositório, explore — não pergunte.**
   Use `grep_search`, `read_file`, `file_search` ou `explore_subagent` antes de incomodar
   o aluno com algo que o próprio código já decide.
3. **Postura zero-fluff** (per `.github/copilot-instructions.md` §6): direto, técnico,
   formal. Sem analogias, sem validação emocional, sem "Peço desculpas". Aponte
   inconsistências do plano sem rodeios.
4. **Bloqueie qualquer desvio da stack obrigatória do enunciado** (per §0.2): Node 20+ TS,
   Express, Prisma + adapter `better-sqlite3`, SQLite, JWT + bcrypt, Zod, Vitest +
   Supertest, ≥70 % de cobertura. Se o aluno propuser Postgres, Supabase, MongoDB, Vercel
   ou afins, a sabatina deve começar exatamente por aí.
5. **Defesa oral.** Lembre que o trabalho é avaliado individualmente em prova oral
   (per §0.1): toda decisão precisa ser sustentável verbalmente pelo aluno. Pergunte
   "como você justifica isto ao Prof. Otávio?" sempre que detectar decisão decorada.
6. **Registre o consenso.** Ao fim de cada ramo resolvido, sintetize em 1–2 linhas a
   decisão acordada antes de partir para o próximo ramo.

## Ramos obrigatórios da árvore (varra nesta ordem)

Antes de qualquer plano específico, valide estes eixos com o aluno (pulando os que o
repositório já resolveu):

1. **Conformidade com o enunciado**
   - O plano altera alguma das 4 entidades (`User`, `Professional`, `Service`,
     `Appointment`)? Mantém ≥1 relacionamento com `include`?
   - Mantém ≥1 rota só-ADMIN e ≥1 rota com ownership?
   - Senha continua fora das respostas? `deletedAt` (soft delete) preservado?

2. **Stack e arquitetura**
   - Por que esta camada/módulo e não outro existente? Há duplicação com `src/lib`?
   - Imports ESM com `.js` (NodeNext)? TypeScript strict não quebra?
   - Algum `any` implícito? Algum `console.log` fora de `server.ts`/`error.ts`?

3. **Validação e segurança**
   - Toda entrada passa por Zod antes do Prisma?
   - Erros usam `HttpError` ou ZodError (que viram 400/401/403/404/409/422 corretos)?
   - Algum segredo novo? Foi adicionado a `.env.example`? `docs/secrets.md` continua
     gitignored (`git check-ignore -v`)?

4. **Persistência e migrations**
   - Mudança no `schema.prisma`? Requer `prisma migrate dev --name <slug>`?
   - Migration é compatível com `migrate deploy` no Docker (sem prompts)?
   - Volume `/app/prisma` do EasyPanel continua íntegro?

5. **Testes e cobertura**
   - Cada rota nova tem teste de integração (sucesso + falha + autorização)?
   - Mantém ≥70 % de cobertura em `lines`/`functions`/`statements` e ≥60 % em `branches`?
   - Os testes não dependem de estado deixado por outro `it()` (lembrar do `afterEach`
     global em `tests/setup.ts`)?

6. **CI/CD e versionamento**
   - O workflow `.github/workflows/ci.yml` segue verde?
   - É mudança de comportamento → exige bump SemVer em `package.json` + nova seção no
     `CHANGELOG.md` no mesmo commit?
   - Commit é atômico (sem "e" na descrição), em pt-BR, Conventional Commits?

7. **Defesa oral**
   - O aluno consegue explicar, sem ler o código: o fluxo da request, onde a Zod valida,
     onde o JWT é verificado, qual middleware aplica ownership, como o soft delete
     evita 200 em recursos deletados?

## Formato de cada pergunta

```
Pergunta N (ramo: <eixo>):
<pergunta direta>

Recomendação: <resposta recomendada com 1–3 linhas de justificativa técnica>
Risco se ignorar: <impacto concreto — perda de pontos, build vermelho, segredo vazado, etc.>
```

## Encerramento

Quando todos os ramos pendentes estiverem resolvidos, produza um **resumo final** no formato:

- **Decisões fechadas:** lista numerada (uma linha cada).
- **Pendências assumidas conscientemente:** o que o aluno escolheu adiar e por quê.
- **Próximo passo executável:** comando(s) PowerShell ou edição concreta a fazer.

Não escreva código de produção dentro desta sabatina — o objetivo é validar o plano. A
implementação é tarefa separada, executada após o aluno confirmar o resumo final.
