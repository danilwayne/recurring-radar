import { supabase } from '../lib/supabaseClient'
import type { BriefContext } from './briefGenerator'
import { buildGroqContext } from './briefGenerator'

// ── Integração via Supabase Edge Function ─────────────────────────────────────
//
// A chave GROQ_API_KEY fica como secret da Edge Function (server-side).
// Nenhuma chave é exposta no bundle do frontend.
//
// Para ativar: deploy da função + definir o secret (ver README ou instruções de deploy).
// Para desativar: mudar isGroqAvailable() para retornar false.
// Para trocar de provedor: alterar apenas supabase/functions/radar-brief/index.ts.
// ─────────────────────────────────────────────────────────────────────────────

export function isGroqAvailable(): boolean {
    return true
}

export async function generateBriefWithGroq(ctx: BriefContext): Promise<string> {
    const { data, error } = await supabase.functions.invoke('radar-brief', {
        body: { context: buildGroqContext(ctx) },
    })

    if (error) throw new Error(error.message)

    const brief = (data as { brief?: string } | null)?.brief
    if (!brief) throw new Error('Edge Function retornou resposta vazia')

    return brief
}
