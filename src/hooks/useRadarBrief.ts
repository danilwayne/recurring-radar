import { useState, useEffect, useRef } from 'react'
import type { Subscription } from './useSubscriptions'
import type { Recommendation, EngineSummary } from '../types/recommendation'
import { generateBriefFallback, BriefContext } from '../services/briefGenerator'
import { isGroqAvailable, generateBriefWithGroq } from '../services/groqClient'

export interface RadarBrief {
    brief: string
    isAIEnhanced: boolean
}

// Fingerprint that changes when recommendations change (add/dismiss/snooze).
// Stable across re-renders when recommendations haven't changed.
function fingerprint(recs: Recommendation[], subsLength: number): string {
    return `${subsLength}:${recs.map(r => r.id).join('|')}`
}

export function useRadarBrief(
    subs: Subscription[],
    recommendations: Recommendation[],
    summary: EngineSummary,
    user: { user_metadata?: { full_name?: string }; email?: string } | null,
): RadarBrief {
    const userName = user?.user_metadata?.full_name?.split(' ')[0]
        ?? user?.email?.split('@')[0]?.split('.')[0]
        ?? null

    const ctx: BriefContext = { subs, recommendations, summary, userName }

    const fallback = generateBriefFallback(ctx)

    const [brief, setBrief] = useState<string>(fallback)
    const [isAIEnhanced, setIsAIEnhanced] = useState(false)

    // Track the last fingerprint for which we've already called Groq.
    // Prevents redundant API calls on re-renders that don't change data.
    const lastFingerprintRef = useRef<string>('')

    useEffect(() => {
        const fp = fingerprint(recommendations, subs.length)

        // Always reset to deterministic brief immediately (instant render).
        setBrief(fallback)
        setIsAIEnhanced(false)

        // Only call Groq when data actually changed and AI is available.
        if (!isGroqAvailable() || recommendations.length === 0 || fp === lastFingerprintRef.current) {
            return
        }

        lastFingerprintRef.current = fp
        let cancelled = false

        generateBriefWithGroq(ctx)
            .then(text => {
                if (!cancelled && text) {
                    setBrief(text)
                    setIsAIEnhanced(true)
                }
            })
            .catch(() => {
                // Fallback already showing — nothing to do.
            })

        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fingerprint(recommendations, subs.length)])

    return { brief, isAIEnhanced }
}
