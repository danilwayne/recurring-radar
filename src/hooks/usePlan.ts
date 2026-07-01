import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export type PlanType = 'free' | 'pro' | 'enterprise'

export const FREE_LIMIT = 3

export function usePlan(userId: string | undefined, subsCount: number, refreshTrigger = 0) {
    const [plan, setPlan] = useState<PlanType>('free')
    const [loadingPlan, setLoadingPlan] = useState(true)

    useEffect(() => {
        if (!userId) {
            setLoadingPlan(false)
            return
        }
        supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single()
            .then(({ data }) => {
                if (data?.plan) setPlan(data.plan as PlanType)
                setLoadingPlan(false)
            })
    }, [userId, refreshTrigger])

    const isPro = plan === 'pro' || plan === 'enterprise'
    const canAddMore = isPro || subsCount < FREE_LIMIT
    const subsRemaining = isPro ? Infinity : Math.max(0, FREE_LIMIT - subsCount)

    return { plan, loadingPlan, canAddMore, subsRemaining }
}
