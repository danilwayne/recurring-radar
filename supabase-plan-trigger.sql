-- Trigger: impede que usuários Free adicionem mais de 3 assinaturas
-- Execute no SQL Editor do Supabase (Dashboard › SQL Editor › New query)

CREATE OR REPLACE FUNCTION public.check_subscription_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_plan  TEXT;
    v_count INT;
BEGIN
    SELECT plan INTO v_plan FROM public.users WHERE id = NEW.user_id;

    IF v_plan = 'free' THEN
        SELECT COUNT(*) INTO v_count
        FROM public.subscriptions
        WHERE user_id = NEW.user_id;

        IF v_count >= 3 THEN
            RAISE EXCEPTION 'Limite do plano Free atingido. Ative o plano Pro para adicionar mais assinaturas.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Idempotente: recria o trigger se já existir
DROP TRIGGER IF EXISTS enforce_free_limit ON public.subscriptions;

CREATE TRIGGER enforce_free_limit
    BEFORE INSERT ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.check_subscription_limit();
