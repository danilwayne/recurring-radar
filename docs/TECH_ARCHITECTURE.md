# TECH ARCHITECTURE — RecurringRadar

---

## Princípios Técnicos

1. **Simplicidade sobre sofisticação** — cada decisão técnica deve ser a mais simples que funciona
2. **Supabase como plataforma** — usar ao máximo o que já existe (Auth, DB, Realtime, Edge Functions)
3. **TypeScript estrito** — sem `any`. Tipos derivados do schema do banco
4. **Engine no cliente** — o Recommendation Engine roda no browser, não precisa de servidor
5. **IA como enhancement opcional** — o produto funciona sem Groq; IA é adicionada depois

---

## Stack Tecnológica

### Atual (mantido)
```
React 18          — UI
TypeScript 5      — Tipagem
Vite 5            — Build + Dev server
Supabase          — Auth + PostgreSQL + Realtime
CSS inline        — Estilização (manter por ora)
```

### A adicionar no MVP
```
Nenhuma nova dependência de terceiros no MVP
```

### A adicionar na V1
```
groq-sdk          — Radar AI (linguagem natural)
react-router-dom  — Navegação (substituir estado manual de page)
```

### A adicionar na V2
```
Supabase Edge Functions — Emails automáticos, cron de Engine
Resend                  — Provedor de email transacional
```

---

## Estrutura de Pastas — Alvo

A estrutura atual (tudo em `App.tsx`) não escala. Migrar para:

```
src/
  types/
    subscription.ts     ← Interface Subscription (movida de useSubscriptions)
    recommendation.ts   ← Interfaces do Engine
    savings.ts          ← Interface Saving
  
  engine/
    index.ts            ← runEngine() — ponto de entrada
    rules/
      rule1-zero-usage.ts
      rule2-low-usage.ts
      rule3-idle-seats.ts
      rule4-duplicate.ts
      rule5-renewal.ts
      rule6-price-increase.ts
      rule7-stale-data.ts
    utils.ts            ← sortRecommendations, deduplicateRecommendations
  
  lib/
    supabaseClient.ts   ← (já existe)
    radarAI.ts          ← cliente Groq (V1.1)
  
  hooks/
    useAuth.ts          ← (já existe, ajustado)
    useSubscriptions.ts ← (já existe, ajustado)
    useRecommendations.ts  ← NEW — roda Engine, gerencia estado
    useSavings.ts          ← NEW — registros de economia
  
  components/
    Login.tsx           ← (já existe)
    ResetPassword.tsx   ← (já existe)
    Sidebar.tsx         ← extraído de App.tsx
    MobileHeader.tsx    ← extraído de App.tsx
    MobileBottomNav.tsx ← extraído de App.tsx
    StatCard.tsx        ← extraído de App.tsx
    UsageBar.tsx        ← extraído de App.tsx
    RecommendationCard.tsx  ← NEW
    ConfirmModal.tsx        ← NEW — substituir window.confirm
    EmptyState.tsx          ← NEW — onboarding
  
  pages/
    Dashboard.tsx       ← extraído de App.tsx
    Subscriptions.tsx   ← extraído de App.tsx
    Opportunities.tsx   ← NEW — tela de recomendações
    Reports.tsx         ← extraído de App.tsx
    Settings.tsx        ← extraído de App.tsx
  
  App.tsx               ← apenas roteamento e layout shell
```

**Migração gradual:** não fazer tudo de uma vez. A cada sprint, extrair os arquivos necessários para aquele sprint. Não refatorar o que não está sendo tocado.

---

## Schema do Banco de Dados — Completo

### Tabelas existentes (no supabase-schema.sql)
- `public.users`
- `public.subscriptions`
- `public.user_preferences`
- `public.audit_logs`

### Novas tabelas necessárias para o MVP

```sql
-- ─── ECONOMIAS REALIZADAS ────────────────────────────────────────
-- Registra cada ação de economia confirmada pelo usuário.
CREATE TABLE IF NOT EXISTS public.savings (
  id                UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id   UUID        REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  subscription_name TEXT        NOT NULL,  -- preserva nome mesmo após deletar
  monthly_amount    DECIMAL(10,2) NOT NULL,
  annual_amount     DECIMAL(10,2) NOT NULL,
  action_type       TEXT        NOT NULL CHECK (action_type IN ('cancelled', 'downgraded', 'consolidated')),
  recommendation_type TEXT,               -- qual regra gerou a recomendação
  notes             TEXT,
  confirmed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "savings: select own" ON public.savings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "savings: insert own" ON public.savings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── AÇÕES DO USUÁRIO NAS RECOMENDAÇÕES ─────────────────────────
-- Registra quando o usuário dispensou ou adiou uma recomendação.
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
  id                  UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id     UUID        NOT NULL,
  recommendation_type TEXT        NOT NULL,
  action              TEXT        NOT NULL CHECK (action IN ('dismissed', 'snoozed', 'completed')),
  snooze_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rec_actions: select own" ON public.recommendation_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rec_actions: insert own" ON public.recommendation_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── ÍNDICES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON public.savings(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_confirmed ON public.savings(confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_actions_user_sub ON public.recommendation_actions(user_id, subscription_id);
```

---

## Fluxo de Dados — MVP

```
useSubscriptions (Supabase → subs[])
         ↓
useRecommendations (subs[] → Engine → recommendations[])
         ↓
Tela "Oportunidades" (renderiza recommendations[])
         ↓
Usuário clica "Confirmar cancelamento"
         ↓
useSavings.recordSaving() → INSERT em public.savings
         ↓
useSubscriptions.updateStatus(id, 'cancelled')
         ↓
Supabase Realtime notifica → subs[] atualizado
         ↓
Engine roda novamente → recommendations[] atualizado
         ↓
Dashboard re-renderiza com novo "Total Economizado"
```

---

## useRecommendations — Contrato do Hook

```typescript
interface UseRecommendationsReturn {
  recommendations: Recommendation[]
  summary: EngineSummary
  loading: boolean
  dismissRecommendation: (subscriptionId: string, type: ReasonCode) => Promise<void>
  snoozeRecommendation: (subscriptionId: string, type: ReasonCode, days: number) => Promise<void>
}

export function useRecommendations(subs: Subscription[]): UseRecommendationsReturn {
  // 1. Buscar ações existentes do usuário (dismissed, snoozed)
  // 2. Rodar Engine com as subscriptions
  // 3. Filtrar recomendações que foram dismissed ou snoozed
  // 4. Retornar lista limpa + summary
}
```

---

## useSavings — Contrato do Hook

```typescript
interface UseSavingsReturn {
  savings: Saving[]
  totalMonthly: number    // Soma de monthly_amount
  totalAnnual: number     // Soma de annual_amount
  roiMultiple: number     // total economizado / preço do plano
  loading: boolean
  recordSaving: (params: RecordSavingParams) => Promise<void>
}

interface RecordSavingParams {
  subscription: Subscription
  action_type: 'cancelled' | 'downgraded' | 'consolidated'
  recommendation_type?: ReasonCode
  notes?: string
}
```

---

## Decisões de Arquitetura — Justificativas

### Por que Engine no cliente, não no servidor?

O Engine é cálculo puro sobre dados que já estão carregados. Não há ganho em fazer uma round-trip ao servidor para calcular regras determinísticas. No cliente, é instantâneo e funciona offline.

A única razão para mover ao servidor seria escala (milhares de subscriptions por usuário) ou segurança (esconder regras de negócio). Nenhum dos dois se aplica ao MVP.

### Por que não React Router agora?

O estado atual (`page` como string no useState) funciona para 5 telas. Adicionar React Router muda a forma de navegar, exige refatoração em vários pontos e não entrega valor ao usuário. Entra na V1 junto com a refatoração geral.

### Por que manter inline styles?

Mudar para Tailwind ou outro sistema de CSS é uma refatoração de 100% do código visual sem entregar valor ao usuário. Mantém inline styles até ter tempo e motivo para migrar (ex: contratar um designer, implementar temas).

### Por que Supabase Realtime continua?

Já está implementado em `useSubscriptions`. Quando o usuário confirma um cancelamento, todos os estados que dependem de `subs[]` atualizam automaticamente. Não há razão para remover.

---

## Regras de Qualidade de Código

A partir do MVP, estas regras são obrigatórias:

1. **Sem `any`** — usar tipos explícitos ou `unknown` com type guard
2. **Sem lógica de negócio em componentes** — componentes só renderizam, não calculam
3. **Uma responsabilidade por hook** — `useAuth` só faz auth, `useSubscriptions` só faz subscriptions
4. **Sem `console.log`** em produção — usar sistema de log estruturado ou remover
5. **Sem `window.confirm` ou `window.alert`** — usar modais do design system

---

## Ambiente e Deploy

```
Desenvolvimento:  npm run server  (Vite dev server, localhost:5173)
Produção:         npm run build   (bundle estático)
Deploy:           Vercel ou Netlify (drop do /dist)
```

Variáveis de ambiente necessárias:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GROQ_API_KEY=    # Apenas na V1.1
```
