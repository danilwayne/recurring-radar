import { useState } from 'react'
import type { Recommendation } from '../types/recommendation'
import { fmtBRL } from '../engine/utils'

interface SavingConfirmModalProps {
    rec: Recommendation
    onConfirm: (rec: Recommendation) => Promise<void>
    onCancel: () => void
}

// NOTE: subscription status will be set to 'cancelar' on confirm.
// When schema adds 'cancelada', migrate this to 'cancelada' for permanence.
export function SavingConfirmModal({ rec, onConfirm, onCancel }: SavingConfirmModalProps) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const showImpact = rec.potentialMonthly > 0

    const handleConfirm = async () => {
        setLoading(true)
        setError(null)
        try {
            await onConfirm(rec)
            setDone(true)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao registrar economia.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
        }}>
            <div style={{
                background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '28px 28px 24px',
                width: '100%', maxWidth: 420,
                fontFamily: "'DM Mono', monospace",
            }}>
                {done ? (
                    /* Success state */
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <div style={{
                            fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 8,
                        }}>
                            Economia registrada!
                        </div>
                        {showImpact && (
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                                {fmtBRL(rec.potentialAnnual)}/ano de economia confirmada.
                            </div>
                        )}
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
                            A assinatura foi marcada como cancelada e o histórico foi salvo.
                        </div>
                        <button
                            onClick={onCancel}
                            style={{
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                                borderRadius: 10, color: '#fff', padding: '11px 28px',
                                cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                fontFamily: "'DM Mono', monospace",
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    /* Confirm state */
                    <>
                        <div style={{
                            fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8,
                        }}>
                            Confirmar economia
                        </div>
                        <div style={{
                            fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 1.7,
                        }}>
                            Você está confirmando o cancelamento de&nbsp;
                            <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{rec.subscriptionName}</span>.
                            A assinatura será marcada como cancelada e a economia ficará registrada no histórico.
                        </div>

                        {showImpact && (
                            <div style={{
                                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: 10, padding: '14px 16px', marginBottom: 20,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                                        Economia mensal
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                                        {fmtBRL(rec.potentialMonthly)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                                        Economia anual
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                                        {fmtBRL(rec.potentialAnnual)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                fontSize: 12, color: '#ef4444',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={onCancel}
                                disabled={loading}
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 10, color: 'rgba(255,255,255,0.6)',
                                    padding: '11px 0', cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: 13, fontFamily: "'DM Mono', monospace",
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    background: loading
                                        ? 'rgba(99,102,241,0.4)'
                                        : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    border: 'none', borderRadius: 10, color: '#fff',
                                    padding: '11px 0', cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                                }}
                            >
                                {loading ? 'Salvando...' : 'Confirmar economia'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
