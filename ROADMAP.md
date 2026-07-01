# RecurringRadar — Roadmap

## Completed

### Phase 0 — Foundation
- Supabase auth (signup, login, password recovery)
- Subscription CRUD (add, edit, delete)
- Settings (profile, password, notifications)
- FK fixed: subscriptions.user_id → auth.users(id)
- Trigger: handle_new_user() creates public.users on signup

### Phase 1 — Recommendation Engine v1
- Engine: 6 deterministic rules (R1–R5, R7)
  - R1: ZERO_USAGE_60D (CRITICAL)
  - R2: LOW_USAGE_30D (HIGH)
  - R3: IDLE_SEATS (MEDIUM)
  - R4: CATEGORY_DUPLICATE (MEDIUM)
  - R5: HIGH_VALUE_RENEWAL (HIGH)
  - R7: STALE_DATA (LOW)
- Rule suppression hierarchy: R1 suppresses R2, R3, R5, R7
- recommendation_actions table: dismiss, snooze (3 days), complete
- SavingConfirmModal: sets subscription status → 'cancelar', records to savings table
- Opportunities page: full recommendation list with cards and action buttons
- Savings recorded: subscription_name, monthly_amount, annual_amount, action_type, confirmed_at

### Phase 2A — Radar Home (Decision Interface)
- Radar screen replaces Dashboard as home
- Philosophy: "The product sells decisions, not dashboards"
- Single priority focus: topRec as dominant card
- Dynamic button labels: "Recuperar R$X/mês" instead of generic action labels
- Post-confirmation banner: "Excelente decisão. Você recuperou R$X/mês."
- Auto-advance: next recommendation surfaces after 4s banner
- Helper functions: getGreeting, generateBriefing, humanizeReason, recoveryLabel
- Nav reduced to 4 items: Radar · Assinaturas · Impacto · Configurações
- "Relatórios" retired as concept
- Impacto screen: ROI proof + spending analysis as context
  - Hero: total recovered (monthly + annual)
  - Timeline: savings grouped by month with action type, "Hoje" badge
  - Spending analysis below divider (Gasto por Categoria, Resumo Financeiro, Top Gastos, Uso)
  - Empty state with CTA → Radar
  - "Ainda em jogo" card with link back to Radar

---

## Next

### Phase 2B — Onboarding
**Why next:** The product only delivers value after the first subscription is added.
The add modal (7 fields including usage_score and last_used) creates friction for new users.
Priority: reduce time-to-first-recommendation.

Candidates:
- Guided first subscription flow with inline explanations
- Smarter defaults for usage_score
- "Import from email" hint (future)

### Phase 3 — Groq Integration (Enrichment Layer)
**Architecture constraint:** Groq as presentation layer only. The Engine remains the decision-maker.
Groq input: structured JSON from Engine (recommendations, subs, savings).
Groq output: natural language briefing that replaces/enriches the current template-based generateBriefing().
The product must function identically if Groq is unavailable — fallback to templates.

Candidates:
- Natural language Radar briefing ("Você está gastando R$890 com ferramentas que ninguém usa...")
- Conversational explanation of each recommendation reason

### Phase 4 — Integrations
- Google Workspace: real usage data for Drive, Meet, Calendar
- Slack: active users per channel → seats_used
- Notion: last_used via API
- When integration data is available, usage_score becomes a measured value, not an estimate

---

## Deferred / Parked

- R6 (ANNUAL_CONTRACT_APPROACHING) — rule deferred pending renewal workflow design
- RadarFeed with activity timestamps — rejected (fabricated data erodes trust)
- Email notifications — parked until product has proven retention without them
- Team/multi-user — parked until single-user product is proven
