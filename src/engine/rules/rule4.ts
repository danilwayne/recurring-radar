import type { Subscription } from '../../hooks/useSubscriptions'
import type { Recommendation } from '../../types/recommendation'

// CATEGORY_DUPLICATE — 2+ active subscriptions in the same category.
// Cross-subscription rule: takes the full subs array, not a single sub.
// Recommends reviewing the cheapest duplicate (most dispensable candidate).
export function rule4CategoryDuplicate(subs: Subscription[]): Recommendation[] {
    const byCategory = new Map<string, Subscription[]>()
    for (const sub of subs) {
        const group = byCategory.get(sub.category) ?? []
        byCategory.set(sub.category, [...group, sub])
    }

    const recs: Recommendation[] = []
    for (const [category, group] of byCategory) {
        if (group.length < 2) continue

        // Recommend reviewing the cheapest one (easiest to cut)
        const sorted = [...group].sort((a, b) => a.price - b.price)
        const cheapest = sorted[0]
        const names = group.map(s => s.name).join(', ')

        recs.push({
            id: `${cheapest.id}:CATEGORY_DUPLICATE`,
            subscriptionId: cheapest.id,
            subscriptionName: cheapest.name,
            subscriptionPrice: cheapest.price,
            subscriptionCategory: cheapest.category,
            type: 'CATEGORY_DUPLICATE',
            priority: 'MEDIUM',
            title: `${group.length} ferramentas de ${category} simultaneamente`,
            reason: `Possível redundância: ${names}. Revise qual é realmente necessária e consolide.`,
            potentialMonthly: cheapest.price,
            potentialAnnual: cheapest.price * 12,
            suggestedAction: 'review',
            actionLabel: 'Registrar economia',
        })
    }

    return recs
}
