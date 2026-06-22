import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface LoginProps {
    onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
    const { signIn, signUp } = useAuth()
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (isSignUp) {
                if (!fullName.trim()) throw new Error('Nome é obrigatório')
                await signUp(email, password, fullName)
                alert('Conta criada! Verifique seu email para confirmar.')
                setIsSignUp(false)
            } else {
                await signIn(email, password)
                onLoginSuccess()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro na autenticação')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#08080f',
            }}
        >
            <div
                style={{
                    background: '#111118',
                    padding: '40px',
                    borderRadius: '14px',
                    width: '100%',
                    maxWidth: '400px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
            >
                <h1
                    style={{
                        color: '#f1f5f9',
                        fontSize: '24px',
                        marginBottom: '30px',
                        textAlign: 'center',
                        fontFamily: 'DM Mono, monospace',
                    }}
                >
                    {isSignUp ? 'Criar Conta' : 'Login'}
                </h1>

                {error && (
                    <div
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '20px',
                            color: '#fca5a5',
                            fontSize: '14px',
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {isSignUp && (
                        <div style={{ marginBottom: '16px' }}>
                            <label
                                style={{
                                    display: 'block',
                                    color: '#f1f5f9',
                                    fontSize: '14px',
                                    marginBottom: '8px',
                                    fontFamily: 'DM Mono, monospace',
                                }}
                            >
                                Nome Completo
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Seu nome"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#08080f',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                    fontSize: '14px',
                                    fontFamily: 'DM Mono, monospace',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label
                            style={{
                                display: 'block',
                                color: '#f1f5f9',
                                fontSize: '14px',
                                marginBottom: '8px',
                                fontFamily: 'DM Mono, monospace',
                            }}
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: '#08080f',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '8px',
                                color: '#f1f5f9',
                                fontSize: '14px',
                                fontFamily: 'DM Mono, monospace',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label
                            style={{
                                display: 'block',
                                color: '#f1f5f9',
                                fontSize: '14px',
                                marginBottom: '8px',
                                fontFamily: 'DM Mono, monospace',
                            }}
                        >
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: '#08080f',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '8px',
                                color: '#f1f5f9',
                                fontSize: '14px',
                                fontFamily: 'DM Mono, monospace',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: loading ? 'rgba(99, 102, 241, 0.5)' : '#6366f1',
                            color: '#f1f5f9',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'DM Mono, monospace',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) (e.target as HTMLButtonElement).style.background = '#8b5cf6'
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) (e.target as HTMLButtonElement).style.background = '#6366f1'
                        }}
                    >
                        {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => {
                        setIsSignUp(!isSignUp)
                        setError(null)
                    }}
                    style={{
                        width: '100%',
                        marginTop: '16px',
                        padding: '10px',
                        background: 'transparent',
                        color: '#8b5cf6',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'DM Mono, monospace',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'rgba(139, 92, 246, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'transparent'
                    }}
                >
                    {isSignUp ? 'Já tenho conta' : 'Criar nova conta'}
                </button>
            </div>
        </div>
    )
}
