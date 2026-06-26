# ReturnFlow — ZF [pro]Parts

Módulo interno de gestão de devoluções e garantias para o marketplace ZF [pro]Parts.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend / BaaS:** Supabase (Auth + PostgreSQL + Storage)
- **Hospedagem:** Cloudflare Pages
- **Sync SharePoint:** Cloudflare Worker (cron 1h)

## Estrutura

```
src/
  components/    # Componentes reutilizáveis
  hooks/         # Custom hooks (useAuth, useSla, useSyncStatus)
  lib/           # Utilitários (supabase, dateUtils, formatters)
  pages/         # Páginas da aplicação
  types/         # TypeScript types

workers/
  sync-orders/   # Cloudflare Worker: sync do order.xlsx (PAD-03)

supabase/
  migrations/    # Histórico do schema
```

## Desenvolvimento local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais Supabase

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

## Pontos a Definir (PAD)

| PAD | Descrição | Status |
|-----|-----------|--------|
| PAD-01 | Chave XML da NF-e no order.xlsx | Aberto |
| PAD-02 | Comportamento do mailto: no ambiente ZF | Aguardando teste |
| PAD-03 | App Registration Azure AD ZF (Graph API) | Aberto |
| PAD-04 | Aprovação compliance Supabase/Cloudflare | Aberto |
| PAD-05 | Volume de devoluções/semana (baseline) | Aberto |

## PRD

Ver: `PRD_ReturnFlow_proParts_v6.md` (ATOM Product Lab)

---

*ReturnFlow v0.1.0 — ATOM Product Lab / ZF [pro]Parts*
