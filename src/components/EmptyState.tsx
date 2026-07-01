interface EmptyStateProps {
    type: 'no-subscriptions' | 'no-opportunities' | 'no-savings'
    onAction?: () => void
    isMobile?: boolean
}

const CONTENT = {
    'no-subscriptions': {
        icon: '📋',
        title: 'Nenhuma assinatura cadastrada',
        description: 'Adicione suas assinaturas para que o Radar identifique onde você está perdendo dinheiro.',
        action: 'Adicionar primeira assinatura',
    },
    'no-opportunities': {
        icon: '✅',
        title: 'Nenhum dinheiro perdido encontrado.',
        description: 'O Radar analisou todas as suas assinaturas e não identificou desperdício. Continuaremos monitorando — você será alertado assim que algo mudar.',
        action: null,
    },
    'no-savings': {
        icon: '💰',
        title: 'Nenhuma economia registrada ainda',
        description: 'Quando você confirmar o cancelamento de uma assinatura, a economia acumulada aparecerá aqui.',
        action: null,
    },
} as const

export function EmptyState({ type, onAction, isMobile }: EmptyStateProps) {
    const { icon, title, description, action } = CONTENT[type]

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: isMobile ? '40px 20px' : '60px 40px',
            textAlign: 'center', maxWidth: 400, margin: '0 auto',
        }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
            <div style={{
                fontSize: 15, fontWeight: 700, color: '#f1f5f9',
                fontFamily: "'DM Mono', monospace", marginBottom: 10,
            }}>
                {title}
            </div>
            <div style={{
                fontSize: 13, color: 'rgba(255,255,255,0.4)',
                fontFamily: "'DM Mono', monospace", lineHeight: 1.7, marginBottom: 24,
            }}>
                {description}
            </div>
            {action && onAction && (
                <button onClick={onAction} style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                    borderRadius: 10, color: '#fff', padding: '12px 24px', cursor: 'pointer',
                    fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                }}>
                    {action}
                </button>
            )}
        </div>
    )
}
