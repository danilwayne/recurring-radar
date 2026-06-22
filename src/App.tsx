import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useSubscriptions, Subscription } from "./hooks/useSubscriptions";
import { Login } from "./components/Login";

const CATEGORIES = ["Todas", "Comunicação", "Design", "Produtividade", "CRM", "Desenvolvimento", "Analytics", "Suporte"];

// ─── HELPERS ────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const totalMonthly = (subs: typeof MOCK_SUBSCRIPTIONS) => subs.reduce((a, s) => a + s.price, 0);
const wasteCost = (subs: typeof MOCK_SUBSCRIPTIONS) => subs.filter(s => s.status === "cancelar" || s.status === "risco").reduce((a, s) => a + s.price, 0);

function statusLabel(s: string) {
    if (s === "ativo") return { label: "Ativo", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
    if (s === "risco") return { label: "Risco", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    return { label: "Cancelar", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
}

function usageColor(score: number) {
    if (score >= 60) return "#22c55e";
    if (score >= 25) return "#f59e0b";
    return "#ef4444";
}

// ─── COMPONENTS ─────────────────────────────────────────────

function Sidebar({ page, setPage, collapsed, setCollapsed, user, onLogout }: any) {
    const nav = [
        { id: "dashboard", icon: "◈", label: "Dashboard" },
        { id: "subscriptions", icon: "⊞", label: "Assinaturas" },
        { id: "alerts", icon: "◉", label: "Alertas" },
        { id: "reports", icon: "▦", label: "Relatórios" },
        { id: "settings", icon: "◎", label: "Configurações" },
    ];

    const userInitials = user?.email
        ?.split("@")[0]
        .split(".")
        .map((p: string) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    return (
        <aside style={{
            width: collapsed ? 64 : 220,
            minHeight: "100vh",
            background: "#0a0a0f",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            padding: "0",
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
            zIndex: 10,
            flexShrink: 0,
        }}>
            {/* Logo */}
            <div style={{ padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                        boxShadow: "0 0 20px rgba(99,102,241,0.4)"
                    }}>⟳</div>
                    {!collapsed && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>RecurringRadar</span>}
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "12px 8px" }}>
                {nav.map(n => (
                    <button key={n.id} onClick={() => setPage(n.id)} style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: collapsed ? "10px 0" : "10px 12px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        borderRadius: 8, border: "none", cursor: "pointer",
                        background: page === n.id ? "rgba(99,102,241,0.15)" : "transparent",
                        color: page === n.id ? "#818cf8" : "rgba(255,255,255,0.45)",
                        marginBottom: 2, transition: "all 0.15s",
                        fontFamily: "'DM Mono', monospace", fontSize: 13,
                    }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                        {!collapsed && <span style={{ whiteSpace: "nowrap", fontWeight: page === n.id ? 600 : 400 }}>{n.label}</span>}
                        {page === n.id && !collapsed && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#818cf8" }} />}
                    </button>
                ))}
            </nav>

            {/* User */}
            <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "8px 0" : "8px 12px", justifyContent: collapsed ? "center" : "flex-start" }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace"
                    }}>{userInitials}</div>
                    {!collapsed && (
                        <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.user_metadata?.full_name || "Usuário"}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>Plano Pro</div>
                        </div>
                    )}
                </div>
                <button onClick={() => { setCollapsed(!collapsed); }} style={{
                    width: "100%", padding: collapsed ? "6px 0" : "6px 12px", marginTop: 4,
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
                    background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer",
                    fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1,
                    display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
                    gap: 6, transition: "all 0.15s",
                }}>
                    <span>{collapsed ? "▶" : "◀"}</span>
                    {!collapsed && "RECOLHER"}
                </button>
                <button onClick={onLogout} style={{
                    width: "100%", padding: collapsed ? "6px 0" : "6px 12px", marginTop: 4,
                    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6,
                    background: "rgba(239,68,68,0.1)", color: "#fca5a5", cursor: "pointer",
                    fontSize: 10, fontFamily: "'DM Mono', monospace",
                    display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
                    gap: 6, transition: "all 0.15s",
                }}>
                    <span>🚪</span>
                    {!collapsed && "LOGOUT"}
                </button>
            </div>
        </aside>
    );
}

function StatCard({ label, value, sub, accent, icon }: any) {
    return (
        <div style={{
            background: "#111118", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "20px 22px",
            position: "relative", overflow: "hidden",
        }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.7, borderRadius: "14px 14px 0 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>{value}</div>
                    {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{sub}</div>}
                </div>
                <div style={{ fontSize: 24, opacity: 0.6 }}>{icon}</div>
            </div>
        </div>
    );
}

function UsageBar({ score }: any) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${score}%`, height: "100%", background: usageColor(score), borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: usageColor(score), minWidth: 28 }}>{score}%</span>
        </div>
    );
}

// ─── PAGES ──────────────────────────────────────────────────

function Dashboard({ subs, setPage, user }: any) {
    const total = totalMonthly(subs);
    const waste = wasteCost(subs);
    const atRisk = subs.filter((s: any) => s.status !== "ativo").length;
    const cancelSubs = subs.filter((s: any) => s.status === "cancelar");

    const userName = user?.user_metadata?.full_name?.split(" ")[0] || "Usuário";

    return (
        <div style={{ padding: "32px 36px", maxWidth: 1100 }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Visão Geral · Junho 2026</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", letterSpacing: -1, margin: 0 }}>Olá, {userName} 👋</h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", fontSize: 13, marginTop: 6 }}>
                    Você tem <span style={{ color: "#ef4444" }}>{cancelSubs.length} assinaturas</span> que podem ser cortadas imediatamente.
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                <StatCard label="Gasto Mensal" value={fmt(total)} sub="12 assinaturas ativas" accent="linear-gradient(90deg,#6366f1,#8b5cf6)" icon="💳" />
                <StatCard label="Desperdício Potencial" value={fmt(waste)} sub={`${atRisk} ferramentas em risco`} accent="linear-gradient(90deg,#ef4444,#f97316)" icon="🔥" />
                <StatCard label="Economia Possível" value={fmt(waste)} sub="se cancelar hoje" accent="linear-gradient(90deg,#22c55e,#10b981)" icon="💰" />
                <StatCard label="Gasto Anual" value={fmt(total * 12)} sub="projeção atual" accent="linear-gradient(90deg,#f59e0b,#fbbf24)" icon="📅" />
            </div>

            {/* Alert banner */}
            {cancelSubs.length > 0 && (
                <div style={{
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 12, padding: "16px 20px", marginBottom: 28,
                    display: "flex", alignItems: "center", gap: 14,
                }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5", fontFamily: "'DM Mono', monospace" }}>
                            {cancelSubs.length} assinaturas não foram usadas nos últimos 60+ dias
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                            {cancelSubs.map((s: any) => s.name).join(", ")} · Total: {fmt(cancelSubs.reduce((a: number, s: any) => a + s.price, 0))}/mês
                        </div>
                    </div>
                    <button onClick={() => setPage("subscriptions")} style={{
                        background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
                        borderRadius: 8, color: "#fca5a5", padding: "8px 16px", cursor: "pointer",
                        fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap"
                    }}>Ver Detalhes →</button>
                </div>
            )}

            {/* Two columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Top spend */}
                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Top Gastos</div>
                    {[...subs].sort((a: any, b: any) => b.price - a.price).slice(0, 5).map((s: any, i: number) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", minWidth: 16 }}>#{i + 1}</span>
                            <span style={{ fontSize: 18 }}>{s.logo}</span>
                            <span style={{ flex: 1, fontSize: 13, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{s.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmt(s.price)}</span>
                        </div>
                    ))}
                </div>

                {/* Usage ranking */}
                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Uso nos Últimos 30 Dias</div>
                    {[...subs].sort((a: any, b: any) => a.usageScore - b.usageScore).slice(0, 5).map((s: any) => (
                        <div key={s.id} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{s.logo} {s.name}</span>
                                {s.usageScore < 20 && <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "2px 6px", borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>CANCELAR</span>}
                            </div>
                            <UsageBar score={s.usageScore} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Subscriptions({ subs, addSubscription, deleteSubscription }: any) {
    const [filter, setFilter] = useState("Todas");
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newSub, setNewSub] = useState({ name: "", category: "Comunicação", price: "", seats: "1", logo: "📦" });
    const [sortBy, setSortBy] = useState("price");

    const filtered = subs
        .filter((s: any) => filter === "Todas" || s.category === filter)
        .filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a: any, b: any) => sortBy === "price" ? b.price - a.price : a.usage_score - b.usage_score);

    const handleAdd = async () => {
        if (!newSub.name || !newSub.price) return;
        setLoading(true);
        try {
            await addSubscription({
                name: newSub.name,
                category: newSub.category,
                price: parseFloat(newSub.price),
                currency: "BRL",
                billing_cycle: "mensal",
                seats: parseInt(newSub.seats),
                last_used: null,
                logo_url: newSub.logo,
                status: "active",
                usage_score: 50,
                renew_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
            } as Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
            setNewSub({ name: "", category: "Comunicação", price: "", seats: "1", logo: "📦" });
            setShowModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Erro ao adicionar");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm("Tem certeza?")) return;
        try {
            await deleteSubscription(id);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Erro ao remover");
        }
    };

    const inputStyle: any = {
        width: "100%", padding: "10px 12px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
        color: "#f1f5f9", fontFamily: "'DM Mono', monospace", fontSize: 13,
        outline: "none", boxSizing: "border-box",
    };

    return (
        <div style={{ padding: "32px 36px", maxWidth: 1100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
                <div>
                    <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Gerenciar</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Assinaturas</h1>
                </div>
                <button onClick={() => setShowModal(true)} style={{
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                    borderRadius: 10, color: "#fff", padding: "10px 20px", cursor: "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                    boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
                }}>+ Nova Assinatura</button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ferramenta..." style={{
                    ...inputStyle, width: 200, padding: "8px 12px"
                }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setFilter(c)} style={{
                            padding: "7px 14px", borderRadius: 8, border: "1px solid",
                            borderColor: filter === c ? "#6366f1" : "rgba(255,255,255,0.08)",
                            background: filter === c ? "rgba(99,102,241,0.15)" : "transparent",
                            color: filter === c ? "#818cf8" : "rgba(255,255,255,0.4)",
                            fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer",
                        }}>{c}</button>
                    ))}
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, width: 160, padding: "7px 12px" }}>
                    <option value="price">Ordenar: Preço</option>
                    <option value="usage">Ordenar: Uso</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 80px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Ferramenta", "Categoria", "Valor/mês", "Assentos", "Uso (30d)", "Status", ""].map(h => (
                        <div key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>{h}</div>
                    ))}
                </div>
                {filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                        Nenhuma assinatura encontrada
                    </div>
                ) : (
                    filtered.map((s: any, i: number) => {
                        const st = statusLabel(s.status);
                        return (
                            <div key={s.id} style={{
                                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 80px",
                                padding: "14px 20px", alignItems: "center",
                                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                background: s.status === "cancelar" ? "rgba(239,68,68,0.04)" : "transparent",
                                transition: "background 0.15s",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 20 }}>{s.logo_url || "📦"}</span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{s.name}</div>
                                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>Renova {s.renew_date}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Mono', monospace" }}>{s.category}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmt(s.price)}</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Mono', monospace" }}>{s.seats} usuários</div>
                                <UsageBar score={s.usage_score} />
                                <div>
                                    <span style={{
                                        fontSize: 11, padding: "4px 10px", borderRadius: 6,
                                        fontFamily: "'DM Mono', monospace", fontWeight: 600,
                                        background: st.bg, color: st.color
                                    }}>{st.label}</span>
                                </div>
                                <button onClick={() => handleRemove(s.id)} style={{
                                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: 6, color: "#f87171", padding: "5px 10px",
                                    cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11
                                }}>✕</button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backdropFilter: "blur(4px)"
                }}>
                    <div style={{
                        background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 16, padding: 32, width: 420, position: "relative"
                    }}>
                        <button onClick={() => setShowModal(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
                        <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Nova Entrada</div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: "0 0 24px" }}>Adicionar Assinatura</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {[["Nome da ferramenta", "name", "text", "Ex: Salesforce"], ["Valor mensal (R$)", "price", "number", "Ex: 299.90"], ["Nº de usuários", "seats", "number", "Ex: 5"]].map(([label, key, type, ph]: any) => (
                                <div key={key}>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>{label}</label>
                                    <input type={type} placeholder={ph} value={(newSub as any)[key]} onChange={e => setNewSub(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Categoria</label>
                                <select value={newSub.category} onChange={e => setNewSub(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                                    {CATEGORIES.filter(c => c !== "Todas").map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <button onClick={handleAdd} disabled={loading} style={{
                                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                                borderRadius: 10, color: "#fff", padding: "12px", cursor: loading ? "not-allowed" : "pointer",
                                fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, marginTop: 4,
                            }}>{loading ? "Salvando..." : "Adicionar Assinatura"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Alerts({ subs }: any) {
    const alerts = [
        ...subs.filter((s: any) => s.status === "cancelar").map((s: any) => ({
            type: "danger", icon: "🔴", title: `Cancelar ${s.name} — economize ${fmt(s.price)}/mês`,
            desc: `Última atividade: ${s.lastUsed} dias atrás. Uso: ${s.usageScore}%.`,
            action: "Marcar como cancelado"
        })),
        ...subs.filter((s: any) => s.status === "risco").map((s: any) => ({
            type: "warning", icon: "🟡", title: `${s.name} com baixo uso — verifique necessidade`,
            desc: `Último acesso há ${s.lastUsed} dias. Custo: ${fmt(s.price)}/mês.`,
            action: "Revisar uso"
        })),
        ...subs.filter((s: any) => {
            const d = new Date(s.renewDate);
            const diff = (d.getTime() - new Date().getTime()) / 86400000;
            return diff <= 14 && diff > 0;
        }).map((s: any) => ({
            type: "info", icon: "🔵", title: `${s.name} renova em breve`,
            desc: `Data de renovação: ${s.renewDate}. Valor: ${fmt(s.price)}.`,
            action: "Ver assinatura"
        })),
    ];

    const colors: any = { danger: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", tag: "#fca5a5" }, warning: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", tag: "#fde68a" }, info: { bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.2)", tag: "#a5b4fc" } };

    return (
        <div style={{ padding: "32px 36px", maxWidth: 800 }}>
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Central de</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Alertas Inteligentes</h1>
                <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", fontSize: 12, marginTop: 6 }}>{alerts.length} alertas ativos no momento</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alerts.length === 0 && (
                    <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>
                        ✅ Nenhum alerta no momento. Suas assinaturas estão saudáveis.
                    </div>
                )}
                {alerts.map((a: any, i: number) => {
                    const c = colors[a.type];
                    return (
                        <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                            <span style={{ fontSize: 20, marginTop: 1 }}>{a.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: c.tag, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{a.title}</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>{a.desc}</div>
                            </div>
                            <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, whiteSpace: "nowrap" }}>{a.action}</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Reports({ subs }: any) {
    const byCategory = CATEGORIES.filter(c => c !== "Todas").map(cat => ({
        name: cat,
        total: subs.filter((s: any) => s.category === cat).reduce((a: number, s: any) => a + s.price, 0),
        count: subs.filter((s: any) => s.category === cat).length
    })).filter(c => c.count > 0).sort((a: any, b: any) => b.total - a.total);

    const total = totalMonthly(subs);
    const maxVal = Math.max(...byCategory.map(c => c.total));

    return (
        <div style={{ padding: "32px 36px", maxWidth: 900 }}>
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Análise</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Relatório de Gastos</h1>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Bar chart */}
                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 20, textTransform: "uppercase" }}>Gasto por Categoria</div>
                    {byCategory.map((c: any, i: number) => {
                        const colors2 = ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
                        return (
                            <div key={c.name} style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{c.name}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmt(c.total)}</span>
                                </div>
                                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${(c.total / maxVal) * 100}%`, height: "100%", background: colors2[i % colors2.length], borderRadius: 4, transition: "width 0.8s ease" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24 }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Resumo Financeiro</div>
                        {[
                            ["Gasto mensal", fmt(total)],
                            ["Gasto trimestral", fmt(total * 3)],
                            ["Gasto anual", fmt(total * 12)],
                            ["Custo por usuário/mês", fmt(total / subs.reduce((a: number, s: any) => a + s.seats, 0))],
                            ["Gasto desperdiçado", fmt(wasteCost(subs))],
                        ].map(([l, v]: any) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>{l}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{v}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: 20 }}>
                        <div style={{ fontSize: 12, color: "#86efac", fontFamily: "'DM Mono', monospace", fontWeight: 600, marginBottom: 6 }}>💡 Oportunidade de Economia</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "#4ade80", fontFamily: "'DM Mono', monospace" }}>{fmt(wasteCost(subs))}/mês</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{fmt(wasteCost(subs) * 12)}/ano se agir agora</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Settings() {
    const inputStyle: any = {
        width: "100%", padding: "10px 14px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
        color: "#f1f5f9", fontFamily: "'DM Mono', monospace", fontSize: 13,
        outline: "none", boxSizing: "border-box",
    };
    const [saved, setSaved] = useState(false);

    return (
        <div style={{ padding: "32px 36px", maxWidth: 620 }}>
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Conta</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Configurações</h1>
            </div>

            {/* Profile */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 18 }}>Perfil</div>
                <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{MOCK_USER.avatar}</div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                        <input defaultValue={MOCK_USER.name} style={inputStyle} />
                        <input defaultValue={MOCK_USER.email} style={inputStyle} />
                        <input defaultValue={MOCK_USER.company} style={inputStyle} />
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 18 }}>Notificações</div>
                {[["Alertas de assinatura não usada", true], ["Aviso de renovação (14 dias antes)", true], ["Relatório semanal por email", false], ["Alertas de gasto acima do orçamento", true]].map(([label, def]: any) => {
                    const [on, setOn] = useState(def);
                    return (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Mono', monospace" }}>{label}</span>
                            <button onClick={() => setOn(!on)} style={{
                                width: 40, height: 22, borderRadius: 11, border: "none",
                                background: on ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)",
                                cursor: "pointer", position: "relative", transition: "background 0.2s"
                            }}>
                                <div style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Plan */}
            <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc", fontFamily: "'DM Mono', monospace" }}>Plano Pro Ativo</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>Assinaturas ilimitadas · Relatórios avançados</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>R$49/mês</div>
                </div>
            </div>

            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{
                background: saved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                border: saved ? "1px solid rgba(34,197,94,0.4)" : "none",
                borderRadius: 10, color: saved ? "#4ade80" : "#fff",
                padding: "12px 28px", cursor: "pointer",
                fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                transition: "all 0.3s"
            }}>{saved ? "✓ Salvo com sucesso!" : "Salvar Alterações"}</button>
        </div>
    );
}

// ─── APP ROOT ────────────────────────────────────────────────
export default function App() {
    const { user, loading, signOut } = useAuth();
    const { subs, addSubscription, deleteSubscription } = useSubscriptions(user);
    const [page, setPage] = useState("dashboard");
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;0,700&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }, []);

    if (loading) {
        return (
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: "100vh", background: "#08080f", color: "#f1f5f9",
                fontFamily: "'DM Mono', monospace", fontSize: 14
            }}>
                Carregando...
            </div>
        );
    }

    if (!user) {
        return <Login onLoginSuccess={() => setPage("dashboard")} />;
    }

    const pages: any = {
        dashboard: <Dashboard subs={subs} setPage={setPage} user={user} />,
        subscriptions: <Subscriptions subs={subs} addSubscription={addSubscription} deleteSubscription={deleteSubscription} />,
        alerts: <Alerts subs={subs} />,
        reports: <Reports subs={subs} />,
        settings: <Settings />
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#08080f", color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>
            <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
        button:hover { filter: brightness(1.1); }
        input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #111118; color: #f1f5f9; }
      `}</style>
            <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={signOut} />
            <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
                {pages[page]}
            </main>
        </div>
    );
}
