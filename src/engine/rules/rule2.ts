import type { Subscription } from '../../hooks/useSubscriptions'
import type { Recommendation } from '../../types/recommendation'

// LOW_USAGE_30D — usage_score between 1 and 24.
// Rule 1 (score=0) takes precedence; this only fires if rule1 did not.
export function rule2LowUsage30d(sub: Subscription): Recommendation | null {
    if (sub.status === 'cancelar') return null
    if (sub.usage_score === 0) return null // covered by rule1
    if (sub.usage_score >= 25) return null

    return {
        id: `${sub.id}:LOW_USAGE_30D`,
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        subscriptionPrice: sub.price,
        subscriptionCategory: sub.category,
        type: 'LOW_USAGE_30D',
        priority: sub.usage_score < 10 ? 'HIGH' : 'MEDIUM',
        title: `${sub.name} com baixo uso`,
        reason: `Uso de ${sub.usage_score}% nos últimos 30 dias. Considere fazer downgrade para um plano menor.`,
        potentialMonthly: sub.price,
        potentialAnnual: sub.price * 12,
        suggestedAction: 'downgrade',
        actionLabel: 'Registrar economia',
    }
}
