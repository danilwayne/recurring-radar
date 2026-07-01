-- ═══════════════════════════════════════════════════════════════════
-- RecurringRadar — Tabelas de Economia (Phase 1 prep)
-- Execute em: Supabase Dashboard → SQL Editor → New Query → Run
-- Pré-requisito: supabase-schema.sql já deve ter sido executado.
-- ═══════════════════════════════════════════════════════════════════

-- ─── ECONOMIAS REALIZADAS ────────────────────────────────────────────
-- Registra cada ação de economia confirmada pelo usuário.
-- subscription_id pode ser null se o usuário deletou a assinatura depois.
-- subscription_name é preservado para histórico permanente.
CREATE TABLE IF NOT EXISTS public.savings (
  id                  UUID           NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id     UUID           REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  subscription_name   TEXT           NOT NULL,
  monthly_amount      DECIMAL(10,2)  NOT NULL CHECK (monthly_amount > 0),
  annual_amount       DECIMAL(10,2)  NOT NULL CHECK (annual_amount > 0),
  action_type         TEXT           NOT NULL CHECK (action_type IN ('cancelled', 'downgraded', 'consolidated')),
  recommendation_type TEXT,
  notes               TEXT,
  confirmed_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── AÇÕES NAS RECOMENDAÇÕES ─────────────────────────────────────────
-- Registra quando usuário dispensou ou adiou uma recomendação do Engine.
-- O Engine usa essa tabela para filtrar recs já tratadas.
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
  id                  UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id     UUID        NOT NULL,
  recommendation_type TEXT        NOT NULL,
  action              TEXT        NOT NULL CHECK (action IN ('dismissed', 'snoozed', 'completed')),
  snooze_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_savings_user_id
  ON public.savings(user_id);

CREATE INDEX IF NOT EXISTS idx_savings_confirmed
  ON public.savings(confirmed_at DESC);

CREATE INDEX IF NOT EXISTS idx_rec_actions_user_sub
  ON public.recommendation_actions(user_id, subscription_id);

CREATE INDEX IF NOT EXISTS idx_rec_actions_snooze
  ON public.recommendation_actions(snooze_until)
  WHERE snooze_until IS NOT NULL;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;

-- savings
DROP POLICY IF EXISTS "savings: select own" ON public.savings;
CREATE POLICY "savings: select own"
  ON public.savings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings: insert own" ON public.savings;
CREATE POLICY "savings: insert own"
  ON public.savings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings: delete own" ON public.savings;
CREATE POLICY "savings: delete own"
  ON public.savings FOR DELETE
  USING (auth.uid() = user_id);

-- recommendation_actions
DROP POLICY IF EXISTS "rec_actions: select own" ON public.recommendation_actions;
CREATE POLICY "rec_actions: select own"
  ON public.recommendation_actions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rec_actions: insert own" ON public.recommendation_actions;
CREATE POLICY "rec_actions: insert own"
  ON public.recommendation_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rec_actions: delete own" ON public.recommendation_actions;
CREATE POLICY "rec_actions: delete own"
  ON public.recommendation_actions FOR DELETE
  USING (auth.uid() = user_id);
