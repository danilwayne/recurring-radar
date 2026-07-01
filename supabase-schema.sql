-- ═══════════════════════════════════════════════════════════════════
-- RecurringRadar — Schema Completo + RLS
-- Execute em: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. TABELA DE USUÁRIOS ──────────────────────────────────────────
-- A chave primária é o mesmo UUID do auth.users do Supabase.
-- Isso garante que nunca haverá usuário sem autenticação.
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  full_name   TEXT,
  company     TEXT,
  avatar_url  TEXT,
  plan        TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. TABELA DE ASSINATURAS ───────────────────────────────────────
-- user_id referencia auth.users diretamente (não public.users),
-- garantindo que a FK não quebre mesmo se o perfil ainda não foi criado.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID           NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT           NOT NULL,
  category      TEXT           NOT NULL,
  price         DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency      TEXT           NOT NULL DEFAULT 'BRL',
  billing_cycle TEXT           NOT NULL DEFAULT 'mensal',
  seats         INTEGER        NOT NULL DEFAULT 1 CHECK (seats > 0),
  last_used     TIMESTAMPTZ,
  logo_url      TEXT,
  status        TEXT           NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ativo', 'risco', 'cancelar')),
  usage_score   INTEGER        NOT NULL DEFAULT 0 CHECK (usage_score >= 0 AND usage_score <= 100),
  renew_date    DATE,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── 3. TABELA DE PREFERÊNCIAS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                     UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  currency               TEXT        NOT NULL DEFAULT 'BRL',
  timezone               TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
  theme                  TEXT        NOT NULL DEFAULT 'dark',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. AUDIT LOGS (LGPD) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. ÍNDICES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id   ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id         ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created         ON public.audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- ─── Trigger: cria perfil automaticamente no cadastro ───────────────
-- Quando um usuário se registra via Supabase Auth, uma linha em
-- public.users é criada automaticamente. Sem isso, toda FK falha.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Trigger: atualiza updated_at automaticamente ───────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER set_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada usuário só acessa os PRÓPRIOS dados.
-- Sem isso, qualquer cliente com a anon key lê dados de todos.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- ── Políticas: users ────────────────────────────────────────────────
DROP POLICY IF EXISTS "users: select own" ON public.users;
CREATE POLICY "users: select own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users: update own" ON public.users;
CREATE POLICY "users: update own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Políticas: subscriptions ─────────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions: select own" ON public.subscriptions;
CREATE POLICY "subscriptions: select own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions: insert own" ON public.subscriptions;
CREATE POLICY "subscriptions: insert own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions: update own" ON public.subscriptions;
CREATE POLICY "subscriptions: update own"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions: delete own" ON public.subscriptions;
CREATE POLICY "subscriptions: delete own"
  ON public.subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Políticas: user_preferences ──────────────────────────────────────
DROP POLICY IF EXISTS "preferences: select own" ON public.user_preferences;
CREATE POLICY "preferences: select own"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "preferences: insert own" ON public.user_preferences;
CREATE POLICY "preferences: insert own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "preferences: update own" ON public.user_preferences;
CREATE POLICY "preferences: update own"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Políticas: audit_logs ────────────────────────────────────────────
DROP POLICY IF EXISTS "audit: select own" ON public.audit_logs;
CREATE POLICY "audit: select own"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Logs só são inseridos por funções internas (SECURITY DEFINER),
-- nunca diretamente pelo cliente — sem política de INSERT aqui.
