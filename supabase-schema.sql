-- ─── USERS TABLE (com metadados) ───
CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS TABLE ───
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  billing_cycle TEXT NOT NULL,
  seats INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE,
  logo_url TEXT,
  status TEXT DEFAULT 'active',
  usage_score INTEGER DEFAULT 0,
  renew_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── USER PREFERENCES ───
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── AUDIT LOGS (para LGPD compliance) ───
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── INDEXES ───
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ─── ROW LEVEL SECURITY (RLS) ───
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só veem suas próprias assinaturas
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Política: Preferências
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Logs (usuários veem apenas seus logs)
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);
