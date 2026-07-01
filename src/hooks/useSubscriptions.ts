import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export interface Subscription {
    id: string
    user_id: string
    name: string
    category: string
    price: number
    currency: string
    billing_cycle: string
    seats: number
    last_used: string | null
    logo_url: string | null
    status: string
    usage_score: number
    renew_date: string | null
    data_source: 'manual' | 'csv' | 'integration:google' | 'integration:slack' | 'integration:microsoft' | 'integration:notion'
    created_at: string
    updated_at: string
}

export function useSubscriptions(user: User | null) {
    const [subs, setSubs] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Busca assinaturas do usuário
    useEffect(() => {
        if (!user) {
            setSubs([])
            setLoading(false)
            return
        }

        fetchSubscriptions()

        // Listener para mudanças em tempo real
        const subscription = supabase
            .channel(`subscriptions:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchSubscriptions()
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user])

    const fetchSubscriptions = async () => {
        if (!user?.id) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setSubs(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar assinaturas')
        } finally {
            setLoading(false)
        }
    }

    const addSubscription = async (sub: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        if (!user?.id) throw new Error('Usuário não autenticado')
        const payload = { ...sub, user_id: user.id }
        const { error } = await supabase.from('subscriptions').insert([payload])
        if (error) throw new Error(error.message)
        await fetchSubscriptions()
    }

    const batchAddSubscriptions = async (list: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => {
        if (list.length === 0) return
        if (!user?.id) throw new Error('Usuário não autenticado')
        const payloads = list.map(sub => ({ ...sub, user_id: user.id }))
        const { error } = await supabase.from('subscriptions').insert(payloads)
        if (error) throw new Error(error.message)
        await fetchSubscriptions()
    }

    const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
        const { error } = await supabase
            .from('subscriptions')
            .update(updates)
            .eq('id', id)
        if (error) throw new Error(error.message)
        await fetchSubscriptions()
    }

    const deleteSubscription = async (id: string) => {
        const { error } = await supabase.from('subscriptions').delete().eq('id', id)
        if (error) throw new Error(error.message)
        await fetchSubscriptions()
    }

    return {
        subs,
        loading,
        error,
        addSubscription,
        batchAddSubscriptions,
        updateSubscription,
        deleteSubscription,
    }
}
