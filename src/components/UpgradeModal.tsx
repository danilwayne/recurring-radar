import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FREE_LIMIT } from '../hooks/usePlan'

const FONT = "'DM Mono', monospace"
const PRO_PRICE = 34.90
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props {
    onClose: () => void
    subsCount: number
}

type Status = 'idle' | 'loading' | 'error'

export function UpgradeModal({ onClose, subsCount }: Props) {
    const [status, setStatus] = useState<Status>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleCheckout = async () => {
        setStatus('loading')
        setErrorMsg('')
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    successUrl: `${window.location.origin}?upgrade=success`,
                    cancelUrl:  window.location.origin,
                },
            })
            if (error) throw new Error(error.message)
            const url = (data as { url?: string } | null)?.url
            if (!url) throw new Error('URL de checkout não retornada.')
            window.location.href = url
        } catch (err) {
            setStatus('error')
            setErrorMsg(err instanceof Error ? err.message : 'Erro ao iniciar checkout.')
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', padding: 16,
        }}>
            <div style={{
                background: '#0f0f1a', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 20, padding: 32, maxWidth: 420, width: '100%',
                position: 'relative',
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18,
                }}>✕</button>

                {/* Header */}
                <div style={{ fontSize: 26, marginBottom: 14, color: '#818cf8' }}>✦</div>
                <h2 style={{
                    fontSize: 19, fontWeight: 700, color: '#f1f5f9',
                    fontFamily: FONT, margin: '0 0 10px', lineHeight: 1.35,
                }}>
                    Você está usando bem o RecurringRadar.
                </h2>
                <p style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.5)',
                    fontFamily: FONT, lineHeight: 1.75, margin: '0 0 22px',
                }}>
                    Para monitorar todas as suas ferramentas e recuperar mais, ative o plano Pro.
                </p>

                {/* Pro features */}
                <div style={{
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.13)',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 22,
                }}>
                    {([
                        ['Assinaturas ilimitadas',  'Monitore todo o seu stack sem restrições'],
                        ['Importação ilimitada',    'Planilhas de qualquer tamanho, sem limites'],
                        ['Insights mais profundos', 'Quanto mais dados, mais o Radar aprende'],
                    ] as [string, string][]).map(([title, desc]) => (
                        <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                            <span style={{ color: '#818cf8', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: FONT }}>{title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: FONT }}>{desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Error message */}
                {status === 'error' && (
                    <div style={{
                        fontSize: 12, color: '#f87171', fontFamily: FONT,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                    }}>
                        {errorMsg}
                    </div>
                )}

                {/* Price + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{ flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: FONT, marginBottom: 2 }}>Plano Pro</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT, lineHeight: 1 }}>
                            {fmt(PRO_PRICE)}
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/mês</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={status === 'loading'}
                        style={{
                            flex: 1,
                            background: status === 'loading'
                                ? 'rgba(99,102,241,0.5)'
                                : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            border: 'none', borderRadius: 12,
                            color: '#fff', padding: '13px 16px',
                            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                            fontFamily: FONT, fontSize: 13, fontWeight: 700,
                            boxShadow: status === 'loading' ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {status === 'loading' ? 'Redirecionando...' : 'Quero o Pro →'}
                    </button>
                </div>

                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
                    fontFamily: FONT, fontSize: 11, cursor: 'pointer', padding: 0,
                    width: '100%', textAlign: 'center', marginTop: 4,
                }}>
                    Continuar no Free ({subsCount}/{FREE_LIMIT} ferramentas)
                </button>
            </div>
        </div>
    )
}
