import { useMemo, useState, useEffect } from 'react'
import type { Subscription } from './useSubscriptions'
import type { Recommendation, EngineSummary } from '../types/recommendation'
import { runEngine, computeEngineSummary } from '../engine/index'
import { supabase } from '../lib/supabaseClient'

interface ActionRecord {
    subscription_id: string
    recommendation_type: string
    action: 'dismissed' | 'snoozed' | 'completed'
    snooze_until: string | null
}

export function useRecommendations(subs: Subscription[], userId: string | undefined) {
    const [actions, setActions] = useState<ActionRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) {
            setActions([])
            setLoading(false)
            return
        }
        supabase
            .from('recommendation_actions')
            .select('subscription_id, recommendation_type, action, snooze_until')
            .eq('user_id', userId)
            .then(({ data }) => {
                setActions((data as ActionRecord[]) ?? [])
                setLoading(false)
            })
    }, [userId])

    const recommendations = useMemo<Recommendation[]>(() => {
        const raw = runEngine(subs)
        const now = Date.now()
        return raw.filter(rec => {
            const colonIdx = rec.id.indexOf(':')
            const subId = rec.id.slice(0, colonIdx)
            const type = rec.id.slice(colonIdx + 1)
            const matches = actions.filter(
                a => a.subscription_id === subId && a.recommendation_type === type
            )
            if (matches.length === 0) return true
            // Any completed/dismissed action permanently hides this recommendation
            if (matches.some(a => a.action === 'dismissed' || a.action === 'completed')) return false
            // For snoozed: use the latest snooze_until date
            const latestSnooze = matches
                .filter(a => a.action === 'snoozed' && a.snooze_until)
                .sort((a, b) => new Date(b.snooze_until!).getTime() - new Date(a.snooze_until!).getTime())[0]
            if (latestSnooze) {
                return new Date(latestSnooze.snooze_until!).getTime() <= now
            }
            return true
        })
    }, [subs, actions])

    const summary = useMemo<EngineSummary>(
        () => computeEngineSummary(recommendations),
        [recommendations]
    )

    const dismissRecommendation = async (rec: Recommendation) => {
        if (!userId) return
        const colonIdx = rec.id.indexOf(':')
        const subscription_id = rec.id.slice(0, colonIdx)
        const recommendation_type = rec.id.slice(colonIdx + 1)
        const { error } = await supabase.from('recommendation_actions').insert([{
            user_id: userId,
            subscription_id,
            recommendation_type,
            action: 'completed',
        }])
        if (error) throw new Error(error.message)
        setActions(prev => [
            ...prev,
            { subscription_id, recommendation_type, action: 'completed', snooze_until: null },
        ])
    }

    const snoozeRecommendation = async (rec: Recommendation, days = 3) => {
        if (!userId) return
        const colonIdx = rec.id.indexOf(':')
        const subscription_id = rec.id.slice(0, colonIdx)
        const recommendation_type = rec.id.slice(colonIdx + 1)
        const snooze_until = new Date(Date.now() + days * 86400000).toISOString()
        const { error } = await supabase.from('recommendation_actions').insert([{
            user_id: userId,
            subscription_id,
            recommendation_type,
            action: 'snoozed',
            snooze_until,
        }])
        if (error) throw new Error(error.message)
        setActions(prev => [
            ...prev,
            { subscription_id, recommendation_type, action: 'snoozed', snooze_until },
        ])
    }

    return { recommendations, summary, loading, dismissRecommendation, snoozeRecommendation }
}
