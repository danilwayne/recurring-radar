import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true)
            } else {
                setIsPasswordRecovery(false)
            }
            setSession(session)
            setUser(session?.user ?? null)
        })

        return () => subscription?.unsubscribe()
    }, [])

    const signUp = async (email: string, password: string, fullName?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: fullName ? { full_name: fullName } : {} },
        })
        if (error) throw error
        return data
    }

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
    }

    const forgotPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        })
        if (error) throw error
    }

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        setIsPasswordRecovery(false)
    }

    const updateProfile = async (fullName: string, company: string) => {
        const { error: authError } = await supabase.auth.updateUser({
            data: { full_name: fullName }
        })
        if (authError) throw authError
        const { error } = await supabase
            .from('users')
            .update({ full_name: fullName, company })
            .eq('id', user?.id)
        if (error) throw error
    }

    return {
        user,
        session,
        loading,
        isPasswordRecovery,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        updatePassword,
        updateProfile,
        isAuthenticated: !!user,
    }
}
