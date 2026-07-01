-- Migração: colunas Stripe em public.users
-- Execute no SQL Editor do Supabase (Dashboard › SQL Editor › New query)
-- É idempotente: usa IF NOT EXISTS em tudo

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Índice para lookups rápidos no webhook (stripe_customer_id → user)
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
    ON public.users (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
