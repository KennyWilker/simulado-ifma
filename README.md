# Simulado IFMA — Protótipo/MVP

Sistema web responsivo para aplicação, correção automática e acompanhamento de simulados de **Matemática** e **Português** voltados ao processo seletivo do IFMA (A&K Assessoria).

Disciplina: Gestão da Qualidade e Teste de Software — UEMA/UEMANET (ADS) · Equipe: Kenny Wilker Carvalho Oliveira e Nemilson Ribeiro de Lira.

## Funcionalidades

| Perfil | Telas |
|---|---|
| Público | Login · Cadastro de aluno · Recuperação de senha |
| Aluno | Início (indicadores e meta semanal) · Simulados · Realização com cronômetro · Resultado com gabarito comentado · Relatórios (gráficos e histórico) · Perfil |
| Professor/coordenação | Painel das turmas (indicadores, ranking, questões com menor acerto) · Banco de questões (cadastrar/editar/excluir) · Montagem de simulados · Perfil |

## Stack

- **Front-end:** HTML, CSS e JavaScript puro (módulos ES), SPA com rotas por hash, gráficos em SVG próprio. Sem dependências externas.
- **Back-end:** Node.js 20.19+ (recomendado 22 LTS) com Express 5, `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`.
- **Banco:** MongoDB (Atlas M0). Sem `MONGODB_URI`, o sistema usa um banco **em memória** já populado com dados de demonstração.
- **Testes:** `node:test` + Supertest (29 casos). CI em `.github/workflows/testes.yml`.

## Executar localmente

```bash
cd backend
npm install
npm start          # http://localhost:3000 (API + front-end, banco em memória)
npm test           # testes automatizados
```

Acessos de demonstração (somente no banco em memória):

- Aluno: `joao.silva@aluno.com` / `Aluno1234`
- Professor: `professor@simuladoifma.com` / `Professor123`

## Implantação (custo zero no MVP)

Siga o **Guia de implantação** (PDF) que acompanha o projeto. Resumo: GitHub → MongoDB Atlas (M0) → popular o banco a partir da sua máquina com `npm run seed:env` → Render (API, `rootDir=backend`) → editar `frontend/js/config.js` com a URL do Render → Vercel (`Root Directory = frontend`) → ajustar `FRONTEND_URL` no Render.

## Estrutura

```
backend/
  src/
    app.js, server.js, config.js, seed.js
    db/            adaptadores MongoDB e memória
    middlewares/   auth (JWT + RBAC), sanitização, erros
    routes/        auth, me, simulados, tentativas, resultados, questoes, admin
    services/      correção automática, validação, estatísticas
  tests/           testes automatizados (CT-01 a CT-24, CT-U01 a CT-U05)
frontend/
  index.html, css/style.css
  js/ main.js (rotas), api.js, ui.js, charts.js, views/*.js
```

## API (resumo)

| Método | Rota | Acesso |
|---|---|---|
| POST | `/api/auth/cadastro`, `/api/auth/login`, `/api/auth/recuperar`, `/api/auth/redefinir` | público |
| GET/PUT | `/api/me`, GET `/api/me/estatisticas` | logado |
| GET | `/api/simulados` | logado |
| POST | `/api/simulados/:id/iniciar`, `/api/tentativas/:id/enviar` | aluno |
| GET | `/api/resultados/:id` | dono ou professor |
| CRUD | `/api/questoes`, `/api/simulados` (POST/PUT/PATCH/DELETE) | professor |
| GET | `/api/admin/painel?turma=` | professor |
