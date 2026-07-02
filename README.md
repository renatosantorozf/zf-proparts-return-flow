# ReturnFlow — ZF [pro]Parts

Módulo interno de gestão de devoluções e garantias para o marketplace ZF [pro]Parts. 

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend / BaaS:** Supabase (Auth + PostgreSQL + Storage) 
- **Hospedagem:** Cloudflare Workers (Static Assets)
- **Sync SharePoint:** Cloudflare Worker separado — `workers/sync-orders` (PAD-03)

## Deploy

O projeto usa **Cloudflare Workers com Static Assets** (modelo atual da Cloudflare, que unificou Pages + Workers).

O build do Vite gera os arquivos em `dist/` e o Worker os serve como site estático com suporte a SPA (React Router).

### Via Cloudflare Dashboard (Workers Builds)

1. Workers & Pages → Create application → Worker
2. Connect to Git → selecionar `zf-proparts-return-flow`
3. Build command: `npm run build`
4. Build output: `dist`
5. Adicionar variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local
# Editar .env.local com credenciais Supabase
npm run dev
```

## Estrutura

```
src/
  components/    # Layout, componentes reutilizáveis
  hooks/         # useAuth, useSla, useSyncStatus
  lib/           # supabase, dateUtils, formatters
  pages/         # Kanban, Pedidos, Ticket, Playbook, Config, Login
  types/         # TypeScript types + schema Supabase

workers/
  sync-orders/   # Worker de sync do order.xlsx (PAD-03)

supabase/
  migrations/    # Histórico do schema
```

## Pontos a Definir (PAD)

| PAD | Descrição | Status |
|-----|-----------|--------|
| PAD-01 | Chave XML da NF-e no order.xlsx | Aberto |
| PAD-02 | Comportamento do mailto: no ambiente ZF | Aguardando teste |
| PAD-03 | App Registration Azure AD ZF (Graph API) | Aberto |
| PAD-04 | Aprovação compliance Supabase/Cloudflare | Aberto |
| PAD-05 | Volume de devoluções/semana (baseline) | Aberto |

---

*ReturnFlow v0.1.0 — ATOM Product Lab / ZF [pro]Parts*

<!-- last deploy trigger: 2026-06-26 17:26:50 -->
