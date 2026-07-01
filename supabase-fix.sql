-- ═══════════════════════════════════════════════════════════════════
-- RecurringRadar — Diagnóstico + Correção do FK
-- Execute passo a passo no Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── PASSO 1: Verificar para onde o FK aponta ───────────────────────
-- Se "references_table" = "public.users" → este é o problema.
-- Se "references_table" = "auth.users"   → o FK está correto; veja PASSO 3.
SELECT
  conname AS constraint_name,
  confrelid::regclass AS references_table
FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass
  AND contype = 'f'
  AND conname = 'subscriptions_user_id_fkey';


-- ─── PASSO 2: Verificar se seu usuário existe em public.users ───────
-- Substitua 'seu@email.com' pelo email com que você fez login.
SELECT id, email, full_name
FROM public.users
WHERE email = 'seu@email.com';
-- Se esta query retornar 0 linhas → public.users está vazio para seu usuário.


-- ─── PASSO 3: Verificar se o trigger existe e está ativo ────────────
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Se retornar 0 linhas → o trigger não existe.


-- ═══════════════════════════════════════════════════════════════════
-- CORREÇÃO — Execute os passos abaixo em ordem
-- ═══════════════════════════════════════════════════════════════════

-- ─── FIX 1: Backfill — inserir em public.users todos os usuários
-- que existem em auth.users mas ainda não têm linha em public.users.
-- Seguro de executar múltiplas vezes (ON CONFLICT DO NOTHING).
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT
  au.id,
  au.email,
  NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), '') AS full_name,
  au.raw_user_meta_data->>'avatar_url'                  AS avatar_url,
  au.created_at,
  NOW()
FROM auth.users AS au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;


-- ─── FIX 2: Corrigir o FK para apontar para auth.users ─────────────
-- Execute APENAS se o PASSO 1 mostrou "references_table = public.users".
-- Isso garante que futuras inserções funcionem mesmo sem trigger.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;


-- ─── FIX 3: Recriar o trigger com proteção contra email nulo ────────
-- Execute sempre — sobrescreve o trigger anterior de forma segura.
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
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
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


-- ─── VERIFICAÇÃO FINAL ───────────────────────────────────────────────
-- Confirme que o FK agora aponta para auth.users:
SELECT conname, confrelid::regclass AS references_table
FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass
  AND conname = 'subscriptions_user_id_fkey';

-- Confirme que seu usuário existe em public.users:
SELECT id, email, full_name FROM public.users WHERE email = 'seu@email.com';

-- Se ambas as queries mostrarem resultado correto → pode criar assinaturas.
