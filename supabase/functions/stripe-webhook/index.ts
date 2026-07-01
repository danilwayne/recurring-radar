import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

// Service-role client: bypasses RLS so the webhook can update any user row.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
// by Supabase — no manual secret needed for these two.
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
    // ── 1. Signature verification ──────────────────────────────────────────────
    const sig = req.headers.get('stripe-signature')
    if (!sig) return new Response('Assinatura ausente.', { status: 400 })

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    const stripeKey     = Deno.env.get('STRIPE_SECRET_KEY')!

    const stripe = new Stripe(stripeKey, {
        apiVersion: '2024-06-20',
        httpClient: Stripe.createFetchHttpClient(),
    })

    let event: Stripe.Event
    try {
        // constructEventAsync + createSubtleCryptoProvider = Deno-safe verification
        event = await stripe.webhooks.constructEventAsync(
            body, sig, webhookSecret,
            undefined,
            Stripe.createSubtleCryptoProvider()
        )
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Webhook inválido.'
        return new Response(`Webhook error: ${msg}`, { status: 400 })
    }

    // ── 2. Event handling ──────────────────────────────────────────────────────
    try {
        switch (event.type) {

            // First payment confirmed → activate Pro
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const userId  = session.metadata?.user_id ?? session.client_reference_id
                if (!userId) break

                await supabaseAdmin
                    .from('users')
                    .update({
                        plan:                    'pro',
                        stripe_customer_id:      session.customer      as string,
                        stripe_subscription_id:  session.subscription  as string,
                    })
                    .eq('id', userId)
                break
            }

            // Renewal, upgrade, downgrade, payment failure grace period
            case 'customer.subscription.updated': {
                const sub        = event.data.object as Stripe.Subscription
                const customerId = sub.customer as string

                const { data: row } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()
                if (!row) break

                const isActive = sub.status === 'active' || sub.status === 'trialing'
                await supabaseAdmin
                    .from('users')
                    .update({
                        plan:                   isActive ? 'pro' : 'free',
                        stripe_subscription_id: sub.id,
                    })
                    .eq('id', row.id)
                break
            }

            // Subscription definitively cancelled
            case 'customer.subscription.deleted': {
                const sub        = event.data.object as Stripe.Subscription
                const customerId = sub.customer as string

                const { data: row } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()
                if (!row) break

                await supabaseAdmin
                    .from('users')
                    .update({ plan: 'free', stripe_subscription_id: null })
                    .eq('id', row.id)
                break
            }

            // Payment failed — Stripe retries automatically.
            // subscription.updated/deleted fires if retries exhaust.
            case 'invoice.payment_failed': {
                const invoice    = event.data.object as Stripe.Invoice
                const customerId = invoice.customer as string
                console.log(`[stripe-webhook] invoice.payment_failed for customer ${customerId}`)
                break
            }
        }
    } catch (err) {
        // Return 500 so Stripe retries the event
        const message = err instanceof Error ? err.message : 'Erro interno no webhook.'
        console.error('[stripe-webhook] Error processing event:', event.type, message)
        return new Response(`Erro: ${message}`, { status: 500 })
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
})
