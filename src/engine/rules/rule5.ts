import type { Subscription } from '../../hooks/useSubscriptions'
import type { Recommendation } from '../../types/recommendation'
import { daysUntil } from '../utils'

// HIGH_VALUE_RENEWAL — renewal is imminent but the tool has low usage or is already flagged.
// Creates urgency: decide before being charged again.
export function rule5HighValueRenewal(sub: Subscription): Recommendation | null {
    if (sub.status === 'cancelar') return null

    const days = daysUntil(sub.renew_date)
    if (days === null || days > 14 || days < 0) return null

    const isAtRisk = sub.usage_score < 40 || sub.status === 'risco'
    if (!isAtRisk) return null

    const urgency = days <= 7 ? 'CRITICAL' : 'HIGH'
    const dayStr = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`

    return {
        id: `${sub.id}:HIGH_VALUE_RENEWAL`,
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        subscriptionPrice: sub.price,
        subscriptionCategory: sub.category,
        type: 'HIGH_VALUE_RENEWAL',
        priority: urgency,
        title: `${sub.name} renova ${dayStr} com baixo uso`,
        reason: `Renovação ${dayStr} · Uso registrado: ${sub.usage_score}% · Decida antes de ser cobrado novamente.`,
        potentialMonthly: sub.price,
        potentialAnnual: sub.price * 12,
        suggestedAction: 'cancel',
        actionLabel: 'Confirmar cancelamento',
    }
}
