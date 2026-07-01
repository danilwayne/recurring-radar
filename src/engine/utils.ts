import type { Recommendation, Priority } from '../types/recommendation'

const PRIORITY_ORDER: Record<Priority, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
}

export function sortRecommendations(recs: Recommendation[]): Recommendation[] {
    return [...recs].sort((a, b) => {
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (pDiff !== 0) return pDiff
        return b.potentialMonthly - a.potentialMonthly
    })
}

// Returns how many days have elapsed since dateStr (positive = past). null = invalid/missing date.
export function daysSince(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// Returns how many days remain until dateStr (positive = future). null = invalid/missing date.
export function daysUntil(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return Math.floor((d.getTime() - Date.now()) / 86400000)
}

export function fmtBRL(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
