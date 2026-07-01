-- ⚠️  Apagar usuário cadastrado por engano
-- Execute no: Supabase Dashboard → SQL Editor → New Query → Run
-- Substitua o email abaixo antes de rodar.

-- PASSO 1: confirme que é o usuário certo
SELECT id, email, created_at
FROM auth.users
WHERE email = 'SUBSTITUA_AQUI@email.com';

-- PASSO 2: delete (cascade apaga public.users, subscriptions e preferences automaticamente)
-- Descomente só depois de confirmar o PASSO 1.
/*
DELETE FROM auth.users
WHERE email = 'SUBSTITUA_AQUI@email.com';
*/
