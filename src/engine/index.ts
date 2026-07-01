import type { Subscription } from '../hooks/useSubscriptions'
import type { Recommendation, EngineSummary } from '../types/recommendation'
import { rule1ZeroUsage60d } from './rules/rule1'
import { rule2LowUsage30d } from './rules/rule2'
import { rule3IdleSeats } from './rules/rule3'
import { rule4CategoryDuplicate } from './rules/rule4'
import { rule5HighValueRenewal } from './rules/rule5'
import { rule7StaleData } from './rules/rule7'
import { sortRecommendations } from './utils'

// Rule 6 (PRICE_INCREASE) is deferred — requires a `previous_price` column in subscriptions schema.

export function runEngine(subs: Subscription[]): Recommendation[] {
    // Only consider non-cancelled subscriptions
    const activeSubs = subs.filter(s => s.status !== 'cancelar')
    const recs: Recommendation[] = []

    for (const sub of activeSubs) {
        const r1 = rule1ZeroUsage60d(sub)
        // Rule 2 is skipped if rule 1 already fired (score=0 subsumes low usage)
        const r2 = r1 ? null : rule2LowUsage30d(sub)

        if (r1) recs.push(r1)
        if (r2) recs.push(r2)

        // Rule 3 (reduce seats) is skipped when rule 1 fires — if usage is 0, cancel beats downgrade
        if (!r1) {
            const r3 = rule3IdleSeats(sub)
            if (r3) recs.push(r3)
        }

        // Rule 5 (imminent renewal) is skipped when rule 1 already covers this sub with CRITICAL cancel
        if (!r1) {
            const r5 = rule5HighValueRenewal(sub)
            if (r5) recs.push(r5)
        }

        // Stale data is only surfaced when no usage-based rule fired (prevents noise)
        if (!r1 && !r2) {
            const r7 = rule7StaleData(sub)
            if (r7) recs.push(r7)
        }
    }

    // Rule 4 operates across all active subscriptions
    const r4s = rule4CategoryDuplicate(activeSubs)
    recs.push(...r4s)

    return sortRecommendations(recs)
}

export function computeEngineSummary(recs: Recommendation[]): EngineSummary {
    return {
        totalOpportunities: recs.length,
        totalPotentialMonthly: recs.reduce((a, r) => a + r.potentialMonthly, 0),
        totalPotentialAnnual: recs.reduce((a, r) => a + r.potentialAnnual, 0),
        criticalCount: recs.filter(r => r.priority === 'CRITICAL').length,
    }
}
