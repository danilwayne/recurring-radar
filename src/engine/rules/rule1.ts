import type { Subscription } from '../../hooks/useSubscriptions'
import type { Recommendation } from '../../types/recommendation'
import { daysSince } from '../utils'

// ZERO_USAGE_60D — usage_score is 0, or last_used was 60+ days ago.
// Highest signal for waste: tool is confirmed unused.
export function rule1ZeroUsage60d(sub: Subscription): Recommendation | null {
    if (sub.status === 'cancelar') return null

    const isZeroScore = sub.usage_score === 0
    const daysOld = daysSince(sub.last_used)
    const isAbandonedByDate = daysOld !== null && daysOld >= 60

    if (!isZeroScore && !isAbandonedByDate) return null

    const parts: string[] = []
    if (isZeroScore) parts.push('Uso registrado: 0%')
    if (isAbandonedByDate && daysOld !== null) parts.push(`Último acesso há ${daysOld} dias`)
    if (!sub.last_used) parts.push('Data de último uso não registrada')

    return {
        id: `${sub.id}:ZERO_USAGE_60D`,
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        subscriptionPrice: sub.price,
        subscriptionCategory: sub.category,
        type: 'ZERO_USAGE_60D',
        priority: 'CRITICAL',
        title: `${sub.name} sem uso detectado`,
        reason: parts.join(' · '),
        potentialMonthly: sub.price,
        potentialAnnual: sub.price * 12,
        suggestedAction: 'cancel',
        actionLabel: 'Confirmar cancelamento',
    }
}
