import type { Subscription } from '../../hooks/useSubscriptions'
import type { Recommendation } from '../../types/recommendation'
import { daysSince } from '../utils'

// STALE_DATA — subscription hasn't been updated in 60+ days and is older than 30 days.
// Low priority: no financial impact, but stale data degrades Engine quality for all other rules.
// Only fires when no usage-based rule (rule1/rule2) already fired for this sub.
export function rule7StaleData(sub: Subscription): Recommendation | null {
    if (sub.status === 'cancelar') return null

    const updatedDaysAgo = daysSince(sub.updated_at)
    const createdDaysAgo = daysSince(sub.created_at)

    // Give new subs 30 days before flagging as stale
    if (createdDaysAgo === null || createdDaysAgo <= 30) return null
    if (updatedDaysAgo === null || updatedDaysAgo <= 60) return null

    return {
        id: `${sub.id}:STALE_DATA`,
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        subscriptionPrice: sub.price,
        subscriptionCategory: sub.category,
        type: 'STALE_DATA',
        priority: 'LOW',
        title: `Dados de ${sub.name} podem estar desatualizados`,
        reason: `Não atualizado há ${updatedDaysAgo} dias. Atualize o uso e a data de renovação para obter recomendações precisas.`,
        potentialMonthly: 0,
        potentialAnnual: 0,
        suggestedAction: 'update_data',
        actionLabel: 'Atualizar dados',
    }
}
