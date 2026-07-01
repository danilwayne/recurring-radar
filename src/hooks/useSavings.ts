import { useState, useEffect, useMemo } from 'react'
import type { Saving, RecordSavingParams } from '../types/savings'
import { supabase } from '../lib/supabaseClient'

export function useSavings(userId: string | undefined) {
    const [savings, setSavings] = useState<Saving[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) {
            setSavings([])
            setLoading(false)
            return
        }
        supabase
            .from('savings')
            .select('*')
            .eq('user_id', userId)
            .order('confirmed_at', { ascending: false })
            .then(({ data }) => {
                setSavings((data as Saving[]) ?? [])
                setLoading(false)
            })
    }, [userId])

    const totalMonthly = useMemo(
        () => savings.reduce((a, s) => a + s.monthly_amount, 0),
        [savings]
    )
    const totalAnnual = useMemo(
        () => savings.reduce((a, s) => a + s.annual_amount, 0),
        [savings]
    )

    const recordSaving = async ({ subscription, action_type, recommendation_type, notes }: RecordSavingParams) => {
        if (!userId) return
        const { error } = await supabase.from('savings').insert([{
            user_id: userId,
            subscription_id: subscription.id,
            subscription_name: subscription.name,
            monthly_amount: subscription.price,
            annual_amount: subscription.price * 12,
            action_type,
            recommendation_type: recommendation_type ?? null,
            notes: notes ?? null,
        }])
        if (error) throw new Error(error.message)
        const { data } = await supabase
            .from('savings')
            .select('*')
            .eq('user_id', userId)
            .order('confirmed_at', { ascending: false })
        setSavings((data as Saving[]) ?? [])
    }

    return { savings, totalMonthly, totalAnnual, loading, recordSaving }
}
