export type RecommendationType =
    | 'ZERO_USAGE_60D'
    | 'LOW_USAGE_30D'
    | 'IDLE_SEATS'
    | 'CATEGORY_DUPLICATE'
    | 'HIGH_VALUE_RENEWAL'
    | 'STALE_DATA'

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type SuggestedAction = 'cancel' | 'downgrade' | 'review' | 'update_data'

export interface Recommendation {
    id: string                    // `${subscriptionId}:${type}`
    subscriptionId: string
    subscriptionName: string
    subscriptionPrice: number
    subscriptionCategory: string
    type: RecommendationType
    priority: Priority
    title: string
    reason: string
    potentialMonthly: number
    potentialAnnual: number
    suggestedAction: SuggestedAction
    actionLabel: string
}

export interface EngineSummary {
    totalOpportunities: number
    totalPotentialMonthly: number
    totalPotentialAnnual: number
    criticalCount: number
}
