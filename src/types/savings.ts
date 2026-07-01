import type { Subscription } from '../hooks/useSubscriptions'
import type { RecommendationType } from './recommendation'

export interface Saving {
    id: string
    user_id: string
    subscription_id: string | null
    subscription_name: string
    monthly_amount: number
    annual_amount: number
    action_type: 'cancelled' | 'downgraded' | 'consolidated'
    recommendation_type: RecommendationType | null
    notes: string | null
    confirmed_at: string
    created_at: string
}

export interface RecordSavingParams {
    subscription: Subscription
    action_type: 'cancelled' | 'downgraded' | 'consolidated'
    recommendation_type?: RecommendationType
    notes?: string
}
