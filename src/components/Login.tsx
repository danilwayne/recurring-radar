import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'signup' | 'forgot'

interface LoginProps {
    onLoginSuccess: () => void
}

const FONT = "'DM Mono', monospace"

const cardStyle: React.CSSProperties = {
    background: '#111118',
    padding: '40px',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid rgba(99, 102, 241, 0.2)',
}

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

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#f1f5f9',
    fontSize: '14px',
    marginBottom: '8px',
    fontFamily: FONT,
}

const primaryBtn: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    background: '#6366f1',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: FONT,
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
}

const ghostBtn: React.CSSProperties = {
    width: '100%',
    marginTop: '12px',
    padding: '10px',
    background: 'transparent',
    color: '#8b5cf6',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: FONT,
    cursor: 'pointer',
    transition: 'all 0.2s',
}

export function Login({ onLoginSuccess }: LoginProps) {
    const { signIn, signUp, forgotPassword } = useAuth()
    const [mode, setMode] = useState<Mode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const reset = (nextMode: Mode) => {
        setMode(nextMode)
        setError(null)
        setSuccessMsg(null)
        setPassword('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMsg(null)
        setLoading(true)

        try {
            if (mode === 'signup') {
                await signUp(email, password, fullName.trim() || undefined)
                setSuccessMsg('Conta criada! Verifique seu email para confirmar.')
                reset('login')
            } else if (mode === 'login') {
                await signIn(email, password)
                onLoginSuccess()
            } else {
                await forgotPassword(email)
                setSuccessMsg('Link enviado! Verifique sua caixa de entrada (e o spam).')
                setEmail('')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro na autenticação')
        } finally {
            setLoading(false)
        }
    }

    const titles: Record<Mode, string> = {
        login: 'Login',
        signup: 'Criar Conta',
        forgot: 'Recuperar Senha',
    }

    const submitLabels: Record<Mode, string> = {
        login: 'Entrar',
        signup: 'Criar Conta',
        forgot: 'Enviar Link de Recuperação',
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#08080f',
            padding: '20px',
        }}>
            <div style={cardStyle}>
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

                <h1 style={{ color: '#f1f5f9', fontSize: '20px', marginBottom: '24px', textAlign: 'center', fontFamily: FONT, fontWeight: 700 }}>
                    {titles[mode]}
                </h1>

                {mode === 'forgot' && !successMsg && (
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: FONT, fontSize: '13px', textAlign: 'center', marginBottom: '20px', lineHeight: 1.6 }}>
                        Informe seu email e enviaremos um link para redefinir sua senha.
                    </p>
                )}

                {/* Feedback */}
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '13px', fontFamily: FONT }}>
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#86efac', fontSize: '13px', fontFamily: FONT }}>
                        ✓ {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Nome (só no cadastro) */}
                    {mode === 'signup' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>
                                Nome <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>(opcional)</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Seu nome"
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            style={inputStyle}
                        />
                    </div>

                    {/* Senha (não no "esqueci") */}
                    {mode !== 'forgot' && (
                        <div style={{ marginBottom: '8px' }}>
                            <label style={labelStyle}>Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Link "esqueci" visível só no login */}
                    {mode === 'login' && (
                        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                            <button
                                type="button"
                                onClick={() => reset('forgot')}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'rgba(129,140,248,0.8)', fontFamily: FONT,
                                    fontSize: '12px', cursor: 'pointer', padding: 0,
                                    textDecoration: 'underline',
                                }}
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                    )}

                    {mode !== 'login' && <div style={{ marginBottom: '20px' }} />}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ ...primaryBtn, background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1', cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        {loading ? 'Aguarde...' : submitLabels[mode]}
                    </button>
                </form>

                {/* Navegação entre modos */}
                {mode === 'login' && (
                    <button type="button" onClick={() => reset('signup')} style={ghostBtn}>
                        Criar nova conta
                    </button>
                )}

                {mode === 'signup' && (
                    <button type="button" onClick={() => reset('login')} style={ghostBtn}>
                        Já tenho conta
                    </button>
                )}

                {mode === 'forgot' && (
                    <button type="button" onClick={() => reset('login')} style={ghostBtn}>
                        ← Voltar para o login
                    </button>
                )}
            </div>
        </div>
    )
}
