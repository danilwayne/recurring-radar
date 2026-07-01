import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    })
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

    try {
        // ── 1. Validate JWT ────────────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !user) return json({ error: 'Token inválido.' }, 401)

        // ── 2. Parse body ──────────────────────────────────────────────────────
        const { successUrl, cancelUrl } = await req.json() as {
            successUrl?: string
            cancelUrl?: string
        }
        if (!successUrl || !cancelUrl) {
            return json({ error: 'successUrl e cancelUrl são obrigatórios.' }, 400)
        }

        // ── 3. Stripe + admin client ───────────────────────────────────────────
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        console.log('[checkout] step3: stripeKey present?', !!stripeKey)
        const stripe = new Stripe(stripeKey!, {
            apiVersion: '2024-06-20',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // ── 4. Get user row ────────────────────────────────────────────────────
        console.log('[checkout] step4: fetching user row')
        const { data: row, error: rowError } = await supabaseAdmin
            .from('users')
            .select('plan, stripe_customer_id')
            .eq('id', user.id)
            .single()
        console.log('[checkout] step4 result: row=', JSON.stringify(row), 'error=', rowError?.message)

        if (row?.plan === 'pro') {
            return json({ error: 'Usuário já possui o plano Pro.' }, 400)
        }

        // ── 5. Get or create Stripe customer ───────────────────────────────────
        console.log('[checkout] step5: customer')
        let customerId: string
        if (row?.stripe_customer_id) {
            customerId = row.stripe_customer_id
        } else {
            const customer = await stripe.customers.create({
                email: user.email!,
                metadata: { supabase_user_id: user.id },
            })
            customerId = customer.id
            await supabaseAdmin
                .from('users')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }
        console.log('[checkout] step5 done: customerId=', customerId)

        // ── 6. Get price from plans table ─────────────────────────────────────
        console.log('[checkout] step6: fetching price')
        const { data: planRow, error: planError } = await supabaseAdmin
            .from('plans')
            .select('stripe_price_id')
            .eq('id', 'pro')
            .single()
        console.log('[checkout] step6 result: planRow=', JSON.stringify(planRow), 'planError=', planError?.message)

        if (planError || !planRow?.stripe_price_id) {
            return json({ error: 'Preço do plano Pro não configurado. Contate o suporte.' }, 500)
        }

        // ── 7. Create Checkout Session ─────────────────────────────────────────
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: planRow.stripe_price_id, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { user_id: user.id },
            client_reference_id: user.id,
            allow_promotion_codes: true,
        })

        return json({ url: session.url })

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro interno.'
        console.error('[create-checkout] ERROR:', message)
        return json({ error: message }, 500)
    }
})
