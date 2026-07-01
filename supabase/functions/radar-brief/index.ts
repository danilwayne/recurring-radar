import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS ──────────────────────────────────────────────────────────────────────

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Groq ──────────────────────────────────────────────────────────────────────

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.1-8b-instant'

const SYSTEM_PROMPT =
`Você é o assistente financeiro do Radar, um sistema de análise de gastos com assinaturas SaaS para empresas brasileiras.

Seu papel: escreva de 2 a 3 frases em português sobre a situação financeira atual e a ação mais importante a tomar hoje.

Regras inegociáveis:
- Use apenas os dados fornecidos. Nunca invente valores, ferramentas ou recomendações.
- Seja específico: mencione nomes de ferramentas e valores em R$ quando relevante.
- Tom direto, como um CFO de confiança. Sem saudações, sem "Olá", sem "Analisei".
- Texto corrido. Sem markdown, sem listas, sem asteriscos.
- Máximo 3 frases. Termine sempre com ponto final.`

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    })
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS })
    }

    try {
        // ── 1. Autenticação ───────────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization') ?? ''
        if (!authHeader.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, 401)
        }

        // SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo runtime.
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.slice(7),
        )
        if (authError || !user) {
            return json({ error: 'Unauthorized' }, 401)
        }

        // ── 2. Validação do payload ───────────────────────────────────────────
        let body: unknown
        try {
            body = await req.json()
        } catch {
            return json({ error: 'Payload inválido: JSON malformado' }, 400)
        }

        const context = (body as Record<string, unknown>)?.context
        if (typeof context !== 'string' || context.trim().length === 0) {
            return json({ error: 'Payload inválido: "context" deve ser string não vazia' }, 400)
        }
        if (context.length > 2000) {
            return json({ error: 'Payload inválido: "context" muito longo' }, 400)
        }

        // ── 3. Groq ───────────────────────────────────────────────────────────
        const groqKey = Deno.env.get('GROQ_API_KEY')
        if (!groqKey) {
            return json({ error: 'GROQ_API_KEY não configurado na Edge Function' }, 500)
        }

        const groqRes = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user',   content: context.trim() },
                ],
                max_tokens: 140,
                temperature: 0.25,
            }),
        })

        if (!groqRes.ok) {
            const errText = await groqRes.text()
            throw new Error(`Groq ${groqRes.status}: ${errText}`)
        }

        const groqData = await groqRes.json() as {
            choices?: { message?: { content?: string } }[]
        }
        const brief = groqData.choices?.[0]?.message?.content?.trim()
        if (!brief) throw new Error('Groq retornou resposta vazia')

        return json({ brief })

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro interno'
        return json({ error: message }, 500)
    }
})
