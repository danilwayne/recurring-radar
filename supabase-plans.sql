-- Tabela de planos do RecurringRadar
-- Execute no SQL Editor do Supabase (Dashboard › SQL Editor › New query)

CREATE TABLE IF NOT EXISTS public.plans (
    id              TEXT PRIMARY KEY,            -- 'free' | 'pro'
    name            TEXT        NOT NULL,        -- 'Free' | 'Pro'
    price_brl       NUMERIC(10,2) NOT NULL,      -- 0 | 34.90
    stripe_price_id TEXT                         -- preenchido após criar o preço no Stripe
);

-- Usuários autenticados podem ler (para exibir preço no frontend futuramente)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select" ON public.plans
    FOR SELECT TO authenticated USING (true);

-- Dados iniciais
INSERT INTO public.plans (id, name, price_brl, stripe_price_id) VALUES
    ('free', 'Free', 0,     null),
    ('pro',  'Pro',  34.90, null)   -- cole o price_xxxx aqui ou via Table Editor
ON CONFLICT (id) DO NOTHING;
