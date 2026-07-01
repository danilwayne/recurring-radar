interface ConfirmModalProps {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmModal({
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
        }}>
            <div style={{
                background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: 28, width: 360, maxWidth: "calc(100vw - 32px)",
            }}>
                <div style={{
                    fontSize: 16, fontWeight: 700, color: "#f1f5f9",
                    fontFamily: "'DM Mono', monospace", marginBottom: 10,
                }}>{title}</div>
                <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.5)",
                    fontFamily: "'DM Mono', monospace", marginBottom: 24, lineHeight: 1.6,
                }}>{message}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onCancel} style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, color: "rgba(255,255,255,0.6)", padding: "10px 20px",
                        cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 13,
                    }}>{cancelLabel}</button>
                    <button onClick={onConfirm} style={{
                        background: danger ? "rgba(239,68,68,0.2)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        border: danger ? "1px solid rgba(239,68,68,0.4)" : "none",
                        borderRadius: 8, color: danger ? "#fca5a5" : "#fff", padding: "10px 20px",
                        cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                    }}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    )
}
