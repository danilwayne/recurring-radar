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
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
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
        try {
            const { error } = await supabase.from('subscriptions').insert([{ ...sub, user_id: user?.id }])
            if (error) throw error
            await fetchSubscriptions()
        } catch (err) {
            throw err instanceof Error ? err : new Error('Erro ao adicionar assinatura')
        }
    }

    const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update(updates)
                .eq('id', id)

            if (error) throw error
            await fetchSubscriptions()
        } catch (err) {
            throw err instanceof Error ? err : new Error('Erro ao atualizar assinatura')
        }
    }

    const deleteSubscription = async (id: string) => {
        try {
            const { error } = await supabase.from('subscriptions').delete().eq('id', id)
            if (error) throw error
            await fetchSubscriptions()
        } catch (err) {
            throw err instanceof Error ? err : new Error('Erro ao deletar assinatura')
        }
    }

    return {
        subs,
        loading,
        error,
        addSubscription,
        updateSubscription,
        deleteSubscription,
    }
}
