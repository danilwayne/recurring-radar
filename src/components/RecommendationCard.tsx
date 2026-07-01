import type { Recommendation, Priority } from '../types/recommendation'
import { fmtBRL } from '../engine/utils'

interface RecommendationCardProps {
    rec: Recommendation
    onConfirm: (rec: Recommendation) => void
    onSnooze: (rec: Recommendation) => void
    isMobile?: boolean
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
    CRITICAL: { label: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    HIGH:     { label: 'Alto',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    MEDIUM:   { label: 'Médio',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    LOW:      { label: 'Baixo',   color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' },
}

export function RecommendationCard({ rec, onConfirm, onSnooze, isMobile }: RecommendationCardProps) {
    const p = PRIORITY_CONFIG[rec.priority]
    const showImpact = rec.potentialMonthly > 0

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`,
            borderLeft: `3px solid ${p.color}`, borderRadius: 14,
            padding: isMobile ? '16px' : '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: 11, fontWeight: 700, color: p.color,
                            background: p.bg, padding: '2px 8px', borderRadius: 6,
                            fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                        }}>
                            {p.label}
                        </span>
                        <span style={{
                            fontSize: 11, color: 'rgba(255,255,255,0.35)',
                            fontFamily: "'DM Mono', monospace",
                        }}>
                            {rec.subscriptionName}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 14, fontWeight: 700, color: '#f1f5f9',
                        fontFamily: "'DM Mono', monospace", lineHeight: 1.4,
                    }}>
                        {rec.title}
                    </div>
                </div>

                {showImpact && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                            fontSize: 11, color: 'rgba(255,255,255,0.35)',
                            fontFamily: "'DM Mono', monospace", marginBottom: 2,
                        }}>
                            Economia anual
                        </div>
                        <div style={{
                            fontSize: 16, fontWeight: 700, color: '#10b981',
                            fontFamily: "'DM Mono', monospace",
                        }}>
                            {fmtBRL(rec.potentialAnnual)}
                        </div>
                        <div style={{
                            fontSize: 11, color: 'rgba(255,255,255,0.35)',
                            fontFamily: "'DM Mono', monospace",
                        }}>
                            {fmtBRL(rec.potentialMonthly)}/mês
                        </div>
                    </div>
                )}
            </div>

            {/* Reason */}
            <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.5)',
                fontFamily: "'DM Mono', monospace", lineHeight: 1.7,
            }}>
                {rec.reason}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    onClick={() => onConfirm(rec)}
                    style={{
                        background: rec.priority === 'CRITICAL' || rec.priority === 'HIGH'
                            ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                            : 'rgba(255,255,255,0.08)',
                        border: 'none', borderRadius: 8,
                        color: '#fff', padding: '9px 16px', cursor: 'pointer',
                        fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700,
                        flex: isMobile ? 1 : undefined,
                    }}
                >
                    {rec.actionLabel}
                </button>
                {rec.suggestedAction !== 'update_data' && (
                    <button
                        onClick={() => onSnooze(rec)}
                        style={{
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8, color: 'rgba(255,255,255,0.4)',
                            padding: '9px 16px', cursor: 'pointer',
                            fontFamily: "'DM Mono', monospace", fontSize: 12,
                        }}
                    >
                        Adiar 3 dias
                    </button>
                )}
            </div>
        </div>
    )
}
