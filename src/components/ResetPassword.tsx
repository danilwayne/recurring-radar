import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface ResetPasswordProps {
    onSuccess: () => void
}

const FONT = "'DM Mono', monospace"

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#08080f',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    fontFamily: FONT,
    boxSizing: 'border-box',
    outline: 'none',
}

export function ResetPassword({ onSuccess }: ResetPasswordProps) {
    const { updatePassword } = useAuth()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            return
        }
        if (password !== confirm) {
            setError('As senhas não coincidem.')
            return
        }

        setLoading(true)
        try {
            await updatePassword(password)
            setDone(true)
            setTimeout(() => onSuccess(), 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', backgroundColor: '#08080f', padding: '20px',
        }}>
            <div style={{
                background: '#111118', padding: '40px', borderRadius: '14px',
                width: '100%', maxWidth: '400px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                    }}>⟳</div>
                    <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>RecurringRadar</span>
                </div>

                {done ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                        <h2 style={{ color: '#86efac', fontFamily: FONT, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                            Senha redefinida!
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONT, fontSize: 13 }}>
                            Redirecionando para o dashboard...
                        </p>
                    </div>
                ) : (
                    <>
                        <h1 style={{ color: '#f1f5f9', fontSize: '20px', marginBottom: '8px', textAlign: 'center', fontFamily: FONT, fontWeight: 700 }}>
                            Nova Senha
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONT, fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
                            Escolha uma senha segura para sua conta.
                        </p>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '13px', fontFamily: FONT }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '14px', marginBottom: '8px', fontFamily: FONT }}>
                                    Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '14px', marginBottom: '8px', fontFamily: FONT }}>
                                    Confirmar Senha
                                </label>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    placeholder="Repita a senha"
                                    required
                                    style={{
                                        ...inputStyle,
                                        borderColor: confirm && confirm !== password
                                            ? 'rgba(239,68,68,0.5)'
                                            : confirm && confirm === password
                                                ? 'rgba(34,197,94,0.5)'
                                                : 'rgba(99,102,241,0.3)',
                                    }}
                                />
                                {confirm && confirm !== password && (
                                    <span style={{ fontSize: '11px', color: '#fca5a5', fontFamily: FONT, marginTop: 4, display: 'block' }}>
                                        As senhas não coincidem
                                    </span>
                                )}
                                {confirm && confirm === password && (
                                    <span style={{ fontSize: '11px', color: '#86efac', fontFamily: FONT, marginTop: 4, display: 'block' }}>
                                        ✓ Senhas coincidem
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#f1f5f9', border: 'none', borderRadius: '8px',
                                    fontSize: '14px', fontFamily: FONT, fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.2s',
                                }}
                            >
                                {loading ? 'Salvando...' : 'Redefinir Senha'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
