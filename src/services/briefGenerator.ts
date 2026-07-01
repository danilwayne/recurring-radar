import type { Subscription } from '../hooks/useSubscriptions'
import type { Recommendation, EngineSummary } from '../types/recommendation'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BriefContext {
    subs: Subscription[]
    recommendations: Recommendation[]
    summary: EngineSummary
    userName: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Deterministic fallback ────────────────────────────────────────────────────

export function generateBriefFallback({ subs, recommendations, summary }: BriefContext): string {
    if (subs.length === 0) {
        return 'Adicione suas assinaturas e o Radar vai identificar onde existe dinheiro escondido — normalmente em ferramentas que ninguém abre mas continuam sendo cobradas todo mês.'
    }
    if (recommendations.length === 0) {
        return `${subs.length === 1 ? 'Sua assinatura está' : `Suas ${subs.length} assinaturas estão`} com bom uso. O Radar continua monitorando — você será alertado assim que algo mudar.`
    }

    const top = recommendations[0]
    const { criticalCount, totalOpportunities, totalPotentialMonthly } = summary

    if (criticalCount === 0) {
        if (totalOpportunities === 1)
            return `O Radar identificou uma oportunidade de otimização em ${top.subscriptionName}. Não é urgente, mas vale revisar.`
        return `O Radar encontrou ${totalOpportunities} oportunidades de otimização. ${fmtBRL(totalPotentialMonthly)}/mês podem ser redirecionados para ferramentas que realmente geram valor.`
    }

    if (criticalCount === 1)
        return `O Radar identificou que ${top.subscriptionName} não está gerando valor mas continua sendo cobrada. Uma ação hoje pode recuperar ${fmtBRL(top.potentialAnnual)} no próximo ano.`

    return `O Radar encontrou ${criticalCount} situações críticas. Você pode recuperar até ${fmtBRL(totalPotentialMonthly)}/mês se agir nas recomendações abaixo.`
}

// ── Groq prompt context ───────────────────────────────────────────────────────

const TYPE_PT: Record<string, string> = {
    ZERO_USAGE_60D:      'sem uso detectado',
    LOW_USAGE_30D:       'uso baixo',
    IDLE_SEATS:          'licenças ociosas',
    CATEGORY_DUPLICATE:  'ferramenta duplicada na categoria',
    HIGH_VALUE_RENEWAL:  'renovação de alto valor se aproximando',
    STALE_DATA:          'dados desatualizados',
}

export function buildGroqContext({ subs, recommendations, summary, userName }: BriefContext): string {
    const name = userName ? `Usuário: ${userName}\n` : ''
    const header = `${name}${subs.length} assinaturas monitoradas.\nTotal recuperável: ${fmtBRL(summary.totalPotentialMonthly)}/mês | ${summary.totalOpportunities} oportunidade${summary.totalOpportunities !== 1 ? 's' : ''} | ${summary.criticalCount} crítica${summary.criticalCount !== 1 ? 's' : ''}`

    const top3 = recommendations.slice(0, 3).map((r, i) => {
        const type = TYPE_PT[r.type] ?? r.type
        const monthly = fmtBRL(r.potentialMonthly)
        return `${i + 1}. ${r.subscriptionName} — ${type} (${r.priority}) — ${monthly}/mês — ${r.reason}`
    }).join('\n')

    return `${header}\n\nRecomendações (por prioridade):\n${top3}`
}
