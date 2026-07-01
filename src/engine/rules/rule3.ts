import type { Subscription } from '../../hooks/useSubscriptions'
import type { Recommendation } from '../../types/recommendation'
import { fmtBRL } from '../utils'

// IDLE_SEATS — multiple seats contracted but usage suggests only a fraction are active.
// Complements rule1/rule2: different axis (seat count vs. usage percentage).
export function rule3IdleSeats(sub: Subscription): Recommendation | null {
    if (sub.status === 'cancelar') return null
    if (sub.seats <= 1) return null
    if (sub.usage_score >= 30) return null

    const idleSeats = Math.round(sub.seats * (1 - sub.usage_score / 100))
    if (idleSeats <= 0) return null

    const pricePerSeat = sub.price / sub.seats
    const potentialMonthly = parseFloat((pricePerSeat * idleSeats).toFixed(2))

    const s = idleSeats > 1 ? 's' : ''

    return {
        id: `${sub.id}:IDLE_SEATS`,
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        subscriptionPrice: sub.price,
        subscriptionCategory: sub.category,
        type: 'IDLE_SEATS',
        priority: 'HIGH',
        title: `${sub.name} com ${idleSeats} assento${s} ocioso${s}`,
        reason: `${sub.seats} assentos contratados, uso estimado em ${sub.usage_score}%. ` +
            `Aprox. ${idleSeats} assento${s} não utilizado${s} · ${fmtBRL(pricePerSeat)}/assento/mês.`,
        potentialMonthly,
        potentialAnnual: potentialMonthly * 12,
        suggestedAction: 'downgrade',
        actionLabel: 'Registrar economia',
    }
}
