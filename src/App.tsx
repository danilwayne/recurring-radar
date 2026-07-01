import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useSubscriptions, Subscription } from "./hooks/useSubscriptions";
import { useRecommendations } from "./hooks/useRecommendations";
import { useSavings } from "./hooks/useSavings";
import type { Recommendation } from "./types/recommendation";
import { Login } from "./components/Login";
import { ResetPassword } from "./components/ResetPassword";
import { ConfirmModal } from "./components/ConfirmModal";
import { EmptyState } from "./components/EmptyState";
import { RecommendationCard } from "./components/RecommendationCard";
import { SavingConfirmModal } from "./components/SavingConfirmModal";
import ImportWizard from "./components/ImportWizard";
import { useRadarBrief } from "./hooks/useRadarBrief";
import { usePlan } from "./hooks/usePlan";
import { UpgradeModal } from "./components/UpgradeModal";
import { WhatsAppButton } from "./components/WhatsAppButton";

const CATEGORIES = ["Todas", "Comunicação", "Design", "Produtividade", "CRM", "Desenvolvimento", "Analytics", "Suporte"];

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const totalMonthly = (subs: Subscription[]) => subs.reduce((a, s) => a + s.price, 0);
const wasteCost = (subs: Subscription[]) => subs.filter(s => s.status === "cancelar" || s.status === "risco").reduce((a, s) => a + s.price, 0);

function useWindowSize() {
    const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);
    return { isMobile: width < 768, isTablet: width < 1024 };
}

function statusLabel(s: string) {
    if (s === "ativo" || s === "active") return { label: "Ativo", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
    if (s === "risco") return { label: "Risco", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    if (s === "cancelar") return { label: "Cancelar", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    return { label: s, color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };
}

function usageColor(score: number) {
    if (score >= 60) return "#22c55e";
    if (score >= 25) return "#f59e0b";
    return "#ef4444";
}

// ─── RADAR HELPERS ───────────────────────────────────────────

function getGreeting(user: any): string {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    const raw = user?.user_metadata?.full_name?.split(" ")[0]
        || user?.email?.split("@")[0]?.split(".")[0]
        || null;
    const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
    return name ? `${salutation}, ${name}` : salutation;
}


function humanizeReason(rec: Recommendation): string {
    switch (rec.type) {
        case "ZERO_USAGE_60D":
            return `Você está pagando ${fmt(rec.subscriptionPrice)}/mês por uma ferramenta que ninguém abre.`;
        case "CATEGORY_DUPLICATE":
            return `Você já paga por outra ferramenta de ${rec.subscriptionCategory}. Possível redundância — vale consolidar.`;
        case "IDLE_SEATS":
            return "Existem licenças pagas que não têm nenhum uso registrado.";
        case "STALE_DATA":
            return "Atualize os dados desta assinatura para o Radar analisá-la com precisão.";
        default:
            return rec.reason;
    }
}

// ─── RADAR (nova tela principal) ─────────────────────────────

function recoveryLabel(rec: Recommendation): string {
    if (rec.suggestedAction === "update_data") return "Atualizar dados";
    if (rec.potentialMonthly > 0) return `Recuperar ${fmt(rec.potentialMonthly)}/mês`;
    return rec.actionLabel;
}

function Radar({ subs, recommendations, summary, savedMonthly, savedAnnual, recordSaving, updateSubscription, dismissRecommendation, snoozeRecommendation, setPage, user, isMobile }: any) {
    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
    const [confirmedRec, setConfirmedRec] = useState<Recommendation | null>(null);
    const [analysisTime] = useState(() => new Date());

    const topRec: Recommendation | null = recommendations[0] ?? null;
    const afterRecs: Recommendation[] = recommendations.slice(1, 4);

    useEffect(() => {
        if (!confirmedRec) return;
        const t = setTimeout(() => setConfirmedRec(null), 4000);
        return () => clearTimeout(t);
    }, [confirmedRec]);

    const minutesAgo = Math.floor((Date.now() - analysisTime.getTime()) / 60000);
    const timeLabel = minutesAgo < 1 ? "agora há pouco" : minutesAgo < 60 ? `há ${minutesAgo} min` : `às ${analysisTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const { brief: briefing, isAIEnhanced } = useRadarBrief(subs, recommendations, summary, user);
    const greeting = getGreeting(user);

    const handleConfirm = (rec: Recommendation) => {
        if (rec.suggestedAction === "update_data") { setPage("subscriptions"); return; }
        setSelectedRec(rec);
    };

    const handleSavingConfirm = async (rec: Recommendation) => {
        const sub = subs.find((s: any) => s.id === rec.subscriptionId);
        if (!sub) return;
        const actionTypeMap: Record<string, "cancelled" | "downgraded" | "consolidated"> = { cancel: "cancelled", downgrade: "downgraded", review: "consolidated" };
        const action_type = actionTypeMap[rec.suggestedAction] ?? "cancelled";
        await recordSaving({ subscription: sub, action_type, recommendation_type: rec.type });
        if (rec.suggestedAction === "cancel") await updateSubscription(rec.subscriptionId, { status: "cancelar" });
        await dismissRecommendation(rec);
        setConfirmedRec(rec);
    };

    const priorityColor = (p: string) => p === "CRITICAL" ? "#ef4444" : p === "HIGH" ? "#f59e0b" : "#6366f1";
    const priorityBg   = (p: string) => p === "CRITICAL" ? "rgba(239,68,68,0.1)" : p === "HIGH" ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)";
    const priorityIcon = (p: string) => p === "CRITICAL" ? "⚡ Crítico" : p === "HIGH" ? "▲ Alto" : "● Médio";

    const pad = isMobile ? "20px 16px" : "32px 36px";

    return (
        <div style={{ padding: pad, maxWidth: 680 }}>
            {/* ── Greeting ── */}
            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
                    ● {subs.length} assinatura{subs.length !== 1 ? "s" : ""} monitorada{subs.length !== 1 ? "s" : ""} · Análise {timeLabel}
                </div>
                <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", letterSpacing: -1, margin: 0 }}>
                    {greeting} 👋
                </h1>
            </div>

            {/* ── Post-confirmation banner ── */}
            {confirmedRec && (
                <div style={{
                    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
                    borderRadius: 14, padding: isMobile ? "18px" : "22px",
                    marginBottom: isMobile ? 20 : 24, textAlign: "center",
                }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                    <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: "#34d399", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                        Excelente decisão.
                    </div>
                    {confirmedRec.potentialMonthly > 0 && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                            Você acabou de recuperar <strong style={{ color: "#34d399" }}>{fmt(confirmedRec.potentialMonthly)}/mês</strong>.
                            Isso representa <strong style={{ color: "#34d399" }}>{fmt(confirmedRec.potentialAnnual)}/ano</strong>.
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginTop: 10 }}>
                        {recommendations.length > 0 ? "O Radar já identificou a próxima oportunidade." : "O Radar continua monitorando suas assinaturas."}
                    </div>
                </div>
            )}

            {/* ── Hero metrics ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 20 : 24 }}>
                <div style={{
                    background: summary.totalPotentialMonthly > 0 ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${summary.totalPotentialMonthly > 0 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 14, padding: isMobile ? "16px" : "20px",
                }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Dinheiro recuperável</div>
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: summary.totalPotentialMonthly > 0 ? "#f87171" : "#94a3b8", fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
                        {fmt(summary.totalPotentialMonthly)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                        {summary.totalOpportunities > 0 ? `${summary.totalOpportunities} decisão${summary.totalOpportunities !== 1 ? "ões" : ""} pendente${summary.totalOpportunities !== 1 ? "s" : ""}` : "nenhuma pendência"}
                    </div>
                </div>

                <div style={{
                    background: savedMonthly > 0 ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${savedMonthly > 0 ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 14, padding: isMobile ? "16px" : "20px",
                }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Já recuperado</div>
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: savedMonthly > 0 ? "#34d399" : "#94a3b8", fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
                        {fmt(savedMonthly)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                        {savedAnnual > 0 ? `${fmt(savedAnnual)}/ano confirmado` : "confirme uma ação para registrar"}
                    </div>
                </div>
            </div>

            {/* ── Briefing ── */}
            <div style={{
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: 10, padding: "14px 18px", marginBottom: isMobile ? 20 : 28,
            }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "'DM Mono', monospace", lineHeight: 1.75, margin: 0 }}>
                    {briefing}
                    {isAIEnhanced && (
                        <span style={{ marginLeft: 8, fontSize: 9, color: "#818cf8", opacity: 0.5, fontFamily: "'DM Mono', monospace", verticalAlign: "middle" }}>✦ IA</span>
                    )}
                </p>
            </div>

            {/* ── Empty: no subscriptions ── */}
            {subs.length === 0 && (
                <EmptyState type="no-subscriptions" onAction={() => setPage("subscriptions")} isMobile={isMobile} />
            )}

            {/* ── Empty: all healthy ── */}
            {subs.length > 0 && recommendations.length === 0 && (
                <EmptyState type="no-opportunities" isMobile={isMobile} />
            )}

            {/* ── Priority action card ── */}
            {topRec && (
                <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                        Minha prioridade para você hoje
                    </div>
                    <div style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderLeft: `3px solid ${priorityColor(topRec.priority)}`,
                        borderRadius: 14, padding: isMobile ? 18 : 24,
                    }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                                    {topRec.subscriptionName}
                                </div>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                                    color: priorityColor(topRec.priority), background: priorityBg(topRec.priority),
                                    padding: "3px 9px", borderRadius: 6, fontFamily: "'DM Mono', monospace",
                                }}>
                                    {priorityIcon(topRec.priority)}
                                </span>
                            </div>
                            {topRec.potentialMonthly > 0 && (
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>Recuperável/ano</div>
                                    <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#10b981", fontFamily: "'DM Mono', monospace" }}>{fmt(topRec.potentialAnnual)}</div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{fmt(topRec.potentialMonthly)}/mês</div>
                                </div>
                            )}
                        </div>

                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'DM Mono', monospace", lineHeight: 1.7, margin: "0 0 18px 0" }}>
                            {humanizeReason(topRec)}
                        </p>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => handleConfirm(topRec)} style={{
                                flex: isMobile ? 1 : undefined,
                                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                                borderRadius: 10, color: "#fff", padding: "11px 22px",
                                cursor: "pointer", fontFamily: "'DM Mono', monospace",
                                fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
                            }}>
                                {recoveryLabel(topRec)}
                            </button>
                            {topRec.suggestedAction !== "update_data" && (
                                <button onClick={() => snoozeRecommendation(topRec)} style={{
                                    background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                                    borderRadius: 10, color: "rgba(255,255,255,0.4)",
                                    padding: "11px 16px", cursor: "pointer",
                                    fontFamily: "'DM Mono', monospace", fontSize: 12,
                                }}>
                                    Adiar 3 dias
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Depois disso ── */}
            {afterRecs.length > 0 && (
                <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                        Depois disso
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {afterRecs.map((rec: Recommendation) => (
                            <div key={rec.id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "9px 14px", gap: 12,
                                borderLeft: `2px solid ${priorityColor(rec.priority)}`,
                                background: "rgba(255,255,255,0.02)", borderRadius: "0 8px 8px 0",
                            }}>
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Mono', monospace" }}>
                                    · {rec.subscriptionName}
                                </span>
                                {rec.potentialMonthly > 0 && (
                                    <span style={{ fontSize: 12, color: "rgba(16,185,129,0.7)", fontFamily: "'DM Mono', monospace", fontWeight: 600, flexShrink: 0 }}>
                                        +{fmt(rec.potentialMonthly)}/mês
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Link to full list ── */}
            {recommendations.length > 1 && (
                <button onClick={() => setPage("opportunities")} style={{
                    background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, color: "rgba(255,255,255,0.35)",
                    padding: "9px 16px", cursor: "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 11, marginTop: 4,
                }}>
                    Ver lista completa ({recommendations.length} decisões) →
                </button>
            )}

            {selectedRec && (
                <SavingConfirmModal
                    rec={selectedRec}
                    onConfirm={handleSavingConfirm}
                    onCancel={() => setSelectedRec(null)}
                />
            )}
        </div>
    );
}

// ─── SIDEBAR (desktop/tablet) ────────────────────────────────

function Sidebar({ page, setPage, collapsed, setCollapsed, user, onLogout, plan }: any) {
    const nav = [
        { id: "radar", icon: "◈", label: "Radar" },
        { id: "subscriptions", icon: "⊞", label: "Assinaturas" },
        { id: "impact", icon: "◆", label: "Impacto" },
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
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
            zIndex: 10,
            flexShrink: 0,
        }}>
            <div style={{ padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0, boxShadow: "0 0 20px rgba(99,102,241,0.4)"
                    }}>⟳</div>
                    {!collapsed && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>RecurringRadar</span>}
                </div>
            </div>

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
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>{plan === 'free' ? 'Plano Free' : 'Plano Pro'}</div>
                        </div>
                    )}
                </div>
                <button onClick={() => setCollapsed(!collapsed)} style={{
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

// ─── MOBILE HEADER ───────────────────────────────────────────

function MobileHeader({ page, user, onLogout }: any) {
    const pageLabels: Record<string, string> = {
        radar: "Radar",
        subscriptions: "Assinaturas",
        opportunities: "Oportunidades",
        impact: "Impacto",
        settings: "Configurações",
    };

    const userInitials = user?.email
        ?.split("@")[0]
        .split(".")
        .map((p: string) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    return (
        <header style={{
            position: "sticky", top: 0, zIndex: 20,
            background: "#0a0a0f", borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, boxShadow: "0 0 12px rgba(99,102,241,0.4)"
                }}>⟳</div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    {pageLabels[page] || "RecurringRadar"}
                </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace"
                }}>{userInitials}</div>
                <button onClick={onLogout} style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 6, color: "#fca5a5", padding: "5px 10px", cursor: "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                }}>Sair</button>
            </div>
        </header>
    );
}

// ─── MOBILE BOTTOM NAV ───────────────────────────────────────

function MobileBottomNav({ page, setPage }: any) {
    const nav = [
        { id: "radar", icon: "◈", label: "Radar" },
        { id: "subscriptions", icon: "⊞", label: "Planos" },
        { id: "impact", icon: "◆", label: "Impacto" },
        { id: "settings", icon: "◎", label: "Config" },
    ];

    return (
        <nav style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
            background: "#0a0a0f", borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "stretch",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
            {nav.map(n => (
                <button key={n.id} onClick={() => setPage(n.id)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 3, padding: "8px 4px",
                    border: "none", cursor: "pointer",
                    background: page === n.id ? "rgba(99,102,241,0.08)" : "transparent",
                    color: page === n.id ? "#818cf8" : "rgba(255,255,255,0.35)",
                    fontFamily: "'DM Mono', monospace",
                    transition: "color 0.15s",
                    borderTop: page === n.id ? "2px solid #818cf8" : "2px solid transparent",
                }}>
                    <span style={{ fontSize: 17 }}>{n.icon}</span>
                    <span style={{ fontSize: 9, letterSpacing: 0.3 }}>{n.label}</span>
                </button>
            ))}
        </nav>
    );
}

// ─── SHARED COMPONENTS ───────────────────────────────────────

function UsageBar({ score }: { score: number }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${score}%`, height: "100%", background: usageColor(score), borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: usageColor(score), minWidth: 28 }}>{score}%</span>
        </div>
    );
}

// ─── PAGES ───────────────────────────────────────────────────

function Subscriptions({ subs, addSubscription, updateSubscription, deleteSubscription, recommendations, setPage, isMobile, canAddMore }: any) {
    const [filter, setFilter] = useState("Todas");
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [addError, setAddError] = useState("");
    const [newSub, setNewSub] = useState({ name: "", category: "Comunicação", price: "", seats: "1", usage_score: "100", renew_date: "", last_used: "" });
    const [sortBy, setSortBy] = useState("price");
    const [editSub, setEditSub] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: "", category: "Comunicação", price: "", seats: "1", logo: "📦", status: "ativo", usage_score: "50", renew_date: "" });
    const [editLoading, setEditLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    const [showUpgrade, setShowUpgrade] = useState(false);

    const filtered = subs
        .filter((s: any) => filter === "Todas" || s.category === filter)
        .filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a: any, b: any) => sortBy === "price" ? b.price - a.price : a.usage_score - b.usage_score);

    const handleAdd = async () => {
        if (!newSub.name || !newSub.price) return;
        if (!canAddMore) { setShowModal(false); setShowUpgrade(true); return; }
        setLoading(true);
        setAddError("");
        try {
            await addSubscription({
                name: newSub.name,
                category: newSub.category,
                price: parseFloat(newSub.price),
                currency: "BRL",
                billing_cycle: "mensal",
                seats: parseInt(newSub.seats) || 1,
                last_used: newSub.last_used || null,
                logo_url: null,
                status: "ativo",
                usage_score: parseInt(newSub.usage_score) || 100,
                renew_date: newSub.renew_date || null,
                data_source: "manual",
            } as Omit<Subscription, "id" | "user_id" | "created_at" | "updated_at">);
            setNewSub({ name: "", category: "Comunicação", price: "", seats: "1", usage_score: "100", renew_date: "", last_used: "" });
            setAddError("");
            setShowDetails(false);
            setShowModal(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro desconhecido ao adicionar assinatura";
            console.error("[addSubscription]", err);
            setAddError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = (id: string, name: string) => {
        setConfirmModal({
            title: "Remover assinatura",
            message: `Tem certeza que quer remover "${name}"? Essa ação não pode ser desfeita.`,
            onConfirm: async () => {
                try {
                    await deleteSubscription(id);
                    setConfirmModal(null);
                } catch (err) {
                    alert(err instanceof Error ? err.message : "Erro ao remover");
                }
            },
        });
    };

    const handleEditOpen = (s: any) => {
        setEditSub(s);
        setEditForm({
            name: s.name,
            category: s.category,
            price: String(s.price),
            seats: String(s.seats),
            logo: s.logo_url || "📦",
            status: s.status === "active" ? "ativo" : s.status,
            usage_score: String(s.usage_score),
            renew_date: s.renew_date || "",
        });
    };

    const handleEditSave = async () => {
        if (!editSub) return;
        setEditLoading(true);
        try {
            await updateSubscription(editSub.id, {
                name: editForm.name,
                category: editForm.category,
                price: parseFloat(editForm.price),
                seats: parseInt(editForm.seats),
                logo_url: editForm.logo,
                status: editForm.status,
                usage_score: parseInt(editForm.usage_score),
                renew_date: editForm.renew_date || null,
            });
            setEditSub(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Erro ao atualizar");
        } finally {
            setEditLoading(false);
        }
    };

    const inputStyle: any = {
        width: "100%", padding: "10px 12px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
        color: "#f1f5f9", fontFamily: "'DM Mono', monospace", fontSize: 13,
        outline: "none", boxSizing: "border-box",
    };

    const visibleCategories = isMobile
        ? ["Todas", "Comunicação", "Design", "Produtividade", "CRM"]
        : CATEGORIES;

    return (
        <div style={{ padding: isMobile ? "20px 16px" : "32px 36px", maxWidth: 1100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Gerenciar</div>
                    <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Assinaturas</h1>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => canAddMore ? setPage("import") : setShowUpgrade(true)} style={{
                        background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 10, color: "#818cf8", padding: isMobile ? "8px 12px" : "10px 18px", cursor: "pointer",
                        fontFamily: "'DM Mono', monospace", fontSize: isMobile ? 11 : 13, fontWeight: 700, whiteSpace: "nowrap",
                    }}>{isMobile ? "Planilha" : "Importar planilha"}</button>
                    <button onClick={() => canAddMore ? setShowModal(true) : setShowUpgrade(true)} style={{
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                        borderRadius: 10, color: "#fff", padding: isMobile ? "8px 14px" : "10px 20px", cursor: "pointer",
                        fontFamily: "'DM Mono', monospace", fontSize: isMobile ? 12 : 13, fontWeight: 700,
                        boxShadow: "0 4px 20px rgba(99,102,241,0.35)", whiteSpace: "nowrap",
                    }}>{isMobile ? "+ Nova" : "+ Nova Assinatura"}</button>
                </div>
            </div>

            {/* Bridge banner — Radar has a recommendation */}
            {recommendations && recommendations.length > 0 && subs.length > 0 && (
                <div style={{
                    background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.18)",
                    borderRadius: 12, padding: "14px 18px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 16, gap: 12,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", fontFamily: "'DM Mono', monospace" }}>
                                O Radar encontrou algo.
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {recommendations[0].subscriptionName}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setPage("radar")} style={{
                        background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)",
                        borderRadius: 8, color: "#fbbf24", padding: "8px 14px",
                        fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        whiteSpace: "nowrap", flexShrink: 0,
                    }}>Ver no Radar →</button>
                </div>
            )}

            {/* Welcome card — empty state */}
            {subs.length === 0 ? (
                <div style={{
                    background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
                    borderRadius: 16, padding: isMobile ? "32px 20px" : "40px 36px",
                    textAlign: "center",
                }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>◈</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: "0 0 10px" }}>
                        O Radar está pronto.
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", fontSize: 13, margin: "0 0 28px", lineHeight: 1.7 }}>
                        Adicione 1 ou 2 assinaturas que você suspeita<br />que não está usando bem.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
                        <button onClick={() => canAddMore ? setShowModal(true) : setShowUpgrade(true)} style={{
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                            borderRadius: 10, color: "#fff", padding: "13px 20px",
                            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}>+ Adicionar primeira assinatura</button>
                        <button onClick={() => canAddMore ? setPage("import") : setShowUpgrade(true)} style={{
                            background: "none", border: "1px solid rgba(99,102,241,0.25)",
                            borderRadius: 10, color: "#818cf8", padding: "12px 20px",
                            fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer",
                        }}>Tem uma lista pronta? Importar planilha →</button>
                    </div>
                </div>
            ) : (<>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: isMobile ? "nowrap" : "wrap" }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        style={{ ...inputStyle, width: isMobile ? "100%" : 200, padding: "8px 12px" }}
                    />
                    {!isMobile && (
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, width: 160, padding: "7px 12px" }}>
                            <option value="price">Ordenar: Preço</option>
                            <option value="usage">Ordenar: Uso</option>
                        </select>
                    )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {visibleCategories.map(c => (
                        <button key={c} onClick={() => setFilter(c)} style={{
                            padding: "6px 12px", borderRadius: 8, border: "1px solid",
                            borderColor: filter === c ? "#6366f1" : "rgba(255,255,255,0.08)",
                            background: filter === c ? "rgba(99,102,241,0.15)" : "transparent",
                            color: filter === c ? "#818cf8" : "rgba(255,255,255,0.4)",
                            fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer",
                        }}>{c}</button>
                    ))}
                </div>
            </div>

            {/* Mobile: cards | Desktop: table */}
            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
                            Nenhuma assinatura encontrada
                        </div>
                    ) : filtered.map((s: any) => {
                        const st = statusLabel(s.status);
                        return (
                            <div key={s.id} style={{
                                background: "#111118", border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: 12, padding: "14px 16px",
                                borderLeft: `3px solid ${st.color}`,
                            }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 22 }}>{s.logo_url || "📦"}</span>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{s.name}</div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{s.category}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmt(s.price)}</div>
                                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                                    </div>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>USO (30D)</div>
                                    <UsageBar score={s.usage_score} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
                                        Renova {s.renew_date} · {s.seats} usuário{s.seats !== 1 ? "s" : ""}
                                    </span>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => handleEditOpen(s)} style={{
                                            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                                            borderRadius: 6, color: "#818cf8", padding: "4px 10px",
                                            cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11
                                        }}>✎</button>
                                        <button onClick={() => handleRemove(s.id, s.name)} style={{
                                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                            borderRadius: 6, color: "#f87171", padding: "4px 10px",
                                            cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11
                                        }}>✕</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 110px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ferramenta", "Categoria", "Valor/mês", "Assentos", "Uso (30d)", "Status", ""].map(h => (
                            <div key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>{h}</div>
                        ))}
                    </div>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
                            Nenhuma assinatura encontrada
                        </div>
                    ) : filtered.map((s: any, i: number) => {
                        const st = statusLabel(s.status);
                        return (
                            <div key={s.id} style={{
                                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 110px",
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
                                    <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => handleEditOpen(s)} style={{
                                        background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                                        borderRadius: 6, color: "#818cf8", padding: "5px 9px",
                                        cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 12
                                    }}>✎</button>
                                    <button onClick={() => handleRemove(s.id, s.name)} style={{
                                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                        borderRadius: 6, color: "#f87171", padding: "5px 9px",
                                        cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 12
                                    }}>✕</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </>)}

            {/* Modal: adicionar */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
                    display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
                    backdropFilter: "blur(4px)"
                }}>
                    <div style={{
                        background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: isMobile ? "20px 20px 0 0" : 16,
                        padding: 28, width: isMobile ? "100%" : 420,
                        maxHeight: isMobile ? "90dvh" : "auto",
                        overflowY: "auto",
                        position: "relative"
                    }}>
                        <button onClick={() => { setShowModal(false); setAddError(""); setShowDetails(false); }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
                        {isMobile && <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 20px" }} />}
                        <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Nova Entrada</div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: "0 0 22px" }}>Adicionar Assinatura</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                            {/* Primary fields */}
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Nome da ferramenta *</label>
                                <input type="text" placeholder="Ex: Salesforce" value={newSub.name} onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))} style={inputStyle} autoFocus />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Valor mensal (R$) *</label>
                                <input type="number" placeholder="Ex: 299.90" value={newSub.price} onChange={e => setNewSub(p => ({ ...p, price: e.target.value }))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Uso nos últimos 30 dias</label>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {[0, 25, 50, 75, 100].map(v => (
                                        <button key={v} type="button" onClick={() => setNewSub(p => ({ ...p, usage_score: String(v) }))} style={{
                                            flex: 1, padding: "9px 4px",
                                            border: newSub.usage_score === String(v) ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
                                            background: newSub.usage_score === String(v) ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)",
                                            borderRadius: 8,
                                            color: newSub.usage_score === String(v) ? "#818cf8" : "rgba(255,255,255,0.35)",
                                            fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer",
                                        }}>{v}%</button>
                                    ))}
                                </div>
                            </div>

                            {/* Collapsible details */}
                            <button type="button" onClick={() => setShowDetails(p => !p)} style={{
                                background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                                fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer",
                                textAlign: "left", padding: 0, letterSpacing: 0.5,
                            }}>
                                {showDetails ? "▲ Menos detalhes" : "▼ Mais detalhes"}
                            </button>
                            {showDetails && (<>
                                <div>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Categoria</label>
                                    <select value={newSub.category} onChange={e => setNewSub(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                                        {CATEGORIES.filter(c => c !== "Todas").map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Nº de licenças</label>
                                    <input type="number" placeholder="1" min="1" value={newSub.seats} onChange={e => setNewSub(p => ({ ...p, seats: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Data de renovação</label>
                                    <input type="date" value={newSub.renew_date} onChange={e => setNewSub(p => ({ ...p, renew_date: e.target.value }))} style={{ ...inputStyle, colorScheme: "dark" }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Último uso</label>
                                    <input type="date" value={newSub.last_used} onChange={e => setNewSub(p => ({ ...p, last_used: e.target.value }))} style={{ ...inputStyle, colorScheme: "dark" }} />
                                </div>
                            </>)}

                            {addError && (
                                <div style={{
                                    fontSize: 12, color: "#f87171", fontFamily: "'DM Mono', monospace",
                                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: 8, padding: "10px 14px",
                                }}>
                                    {addError}
                                </div>
                            )}
                            <button onClick={handleAdd} disabled={loading || !newSub.name || !newSub.price} style={{
                                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                                borderRadius: 10, color: "#fff", padding: "13px", cursor: (loading || !newSub.name || !newSub.price) ? "not-allowed" : "pointer",
                                fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, marginTop: 4,
                                opacity: (!newSub.name || !newSub.price) ? 0.5 : 1,
                            }}>{loading ? "Salvando..." : "Adicionar Assinatura"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: editar */}
            {editSub && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
                    display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
                    backdropFilter: "blur(4px)"
                }}>
                    <div style={{
                        background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: isMobile ? "20px 20px 0 0" : 16,
                        padding: 28, width: isMobile ? "100%" : 420,
                        maxHeight: isMobile ? "90dvh" : "80vh",
                        overflowY: "auto",
                        position: "relative"
                    }}>
                        <button onClick={() => setEditSub(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
                        {isMobile && <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 20px" }} />}
                        <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Editando</div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: "0 0 22px" }}>{editSub.name}</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {[
                                ["Nome da ferramenta", "name", "text"],
                                ["Valor mensal (R$)", "price", "number"],
                                ["Nº de usuários", "seats", "number"],
                            ].map(([label, key, type]: any) => (
                                <div key={key}>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>{label}</label>
                                    <input type={type} value={(editForm as any)[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Categoria</label>
                                <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                                    {CATEGORIES.filter(c => c !== "Todas").map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Status</label>
                                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                                    <option value="ativo">Ativo</option>
                                    <option value="risco">Risco</option>
                                    <option value="cancelar">Cancelar</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Uso nos últimos 30 dias (%)</label>
                                <input type="number" min="0" max="100" value={editForm.usage_score} onChange={e => setEditForm(p => ({ ...p, usage_score: e.target.value }))} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 6 }}>Data de renovação</label>
                                <input type="date" value={editForm.renew_date} onChange={e => setEditForm(p => ({ ...p, renew_date: e.target.value }))} style={{ ...inputStyle, colorScheme: "dark" }} />
                            </div>
                            <button onClick={handleEditSave} disabled={editLoading} style={{
                                background: editLoading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                                borderRadius: 10, color: "#fff", padding: "13px", cursor: editLoading ? "not-allowed" : "pointer",
                                fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, marginTop: 4,
                            }}>{editLoading ? "Salvando..." : "Salvar Alterações"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: confirmar remoção */}
            {confirmModal && (
                <ConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmLabel="Remover"
                    danger
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
            {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} subsCount={subs.length} />}
        </div>
    );
}

function Opportunities({ subs, recommendations, summary, recordSaving, updateSubscription, dismissRecommendation, snoozeRecommendation, setPage, isMobile }: any) {
    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

    const handleCardConfirm = (rec: Recommendation) => {
        if (rec.suggestedAction === "update_data") {
            setPage("subscriptions");
            return;
        }
        setSelectedRec(rec);
    };

    const handleSavingConfirm = async (rec: Recommendation) => {
        const sub = subs.find((s: any) => s.id === rec.subscriptionId);
        if (!sub) return;
        const actionTypeMap: Record<string, "cancelled" | "downgraded" | "consolidated"> = {
            cancel: "cancelled",
            downgrade: "downgraded",
            review: "consolidated",
        };
        const action_type = actionTypeMap[rec.suggestedAction] ?? "cancelled";
        await recordSaving({ subscription: sub, action_type, recommendation_type: rec.type });
        if (rec.suggestedAction === "cancel") {
            await updateSubscription(rec.subscriptionId, { status: "cancelar" });
        }
        await dismissRecommendation(rec);
    };

    const critical = recommendations.filter((r: Recommendation) => r.priority === "CRITICAL");
    const other = recommendations.filter((r: Recommendation) => r.priority !== "CRITICAL");

    return (
        <div style={{ padding: isMobile ? "20px 16px" : "32px 36px", maxWidth: 800 }}>
            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Motor de Recomendações</div>
                <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Oportunidades</h1>
                {summary.totalOpportunities > 0 && (
                    <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", fontSize: 13, marginTop: 6 }}>
                        {summary.totalOpportunities} oportunidade{summary.totalOpportunities !== 1 ? "s" : ""} · {fmt(summary.totalPotentialAnnual)}/ano em potencial
                    </p>
                )}
            </div>

            {recommendations.length === 0 ? (
                <EmptyState type="no-opportunities" isMobile={isMobile} />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {critical.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                                ⚡ Críticas ({critical.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {critical.map((rec: Recommendation) => (
                                    <RecommendationCard key={rec.id} rec={rec} onConfirm={handleCardConfirm} onSnooze={snoozeRecommendation} isMobile={isMobile} />
                                ))}
                            </div>
                        </div>
                    )}
                    {other.length > 0 && (
                        <div>
                            {critical.length > 0 && (
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                                    Outras ({other.length})
                                </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {other.map((rec: Recommendation) => (
                                    <RecommendationCard key={rec.id} rec={rec} onConfirm={handleCardConfirm} onSnooze={snoozeRecommendation} isMobile={isMobile} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedRec && (
                <SavingConfirmModal
                    rec={selectedRec}
                    onConfirm={handleSavingConfirm}
                    onCancel={() => setSelectedRec(null)}
                />
            )}
        </div>
    );
}

function Impact({ subs, savings, savedMonthly, savedAnnual, setPage, isMobile }: any) {
    const pad = isMobile ? "20px 16px" : "32px 36px";

    // ── Timeline helpers ──
    const isToday = (dateStr: string) => {
        const d = new Date(dateStr), t = new Date();
        return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    };
    const actionMeta: Record<string, { icon: string; label: string; color: string }> = {
        cancelled:    { icon: "✂", label: "Cancelado",      color: "#f87171" },
        downgraded:   { icon: "↓", label: "Plano reduzido", color: "#fbbf24" },
        consolidated: { icon: "⊞", label: "Consolidado",    color: "#818cf8" },
    };
    const groupedByMonth: Record<string, any[]> = savings.reduce((acc: Record<string, any[]>, s: any) => {
        const key = new Date(s.confirmed_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
    }, {});
    const months = Object.keys(groupedByMonth);

    const largestSaving = savings.length > 0
        ? savings.reduce((mx: any, s: any) => s.monthly_amount > mx.monthly_amount ? s : mx, savings[0])
        : null;
    const firstDate = savings.length > 0
        ? new Date(savings[savings.length - 1].confirmed_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
        : null;

    // ── Spending analysis helpers ──
    const byCategory = CATEGORIES.filter(c => c !== "Todas").map(cat => ({
        name: cat,
        total: subs.filter((s: any) => s.category === cat).reduce((a: number, s: any) => a + s.price, 0),
        count: subs.filter((s: any) => s.category === cat).length,
    })).filter(c => c.count > 0).sort((a: any, b: any) => b.total - a.total);
    const currentMonthly = totalMonthly(subs);
    const maxVal = byCategory.length > 0 ? Math.max(...byCategory.map(c => c.total)) : 1;
    const totalSeats = subs.reduce((a: number, s: any) => a + (s.seats || 0), 0);

    return (
        <div style={{ padding: pad, maxWidth: 860 }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
                    Impacto · Dinheiro recuperado com o RecurringRadar
                </div>
                <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", letterSpacing: -1, margin: 0 }}>
                    {savings.length === 0 ? "Nenhuma economia confirmada ainda." : `${fmt(savedAnnual)}/ano recuperado.`}
                </h1>
            </div>

            {/* ── Hero ROI ── */}
            {savings.length > 0 && (
                <div style={{
                    background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: 16, padding: isMobile ? 20 : 28, marginBottom: isMobile ? 20 : 28,
                }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24, marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Total recuperado/ano</div>
                            <div style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, color: "#34d399", fontFamily: "'DM Mono', monospace", letterSpacing: -2, lineHeight: 1 }}>{fmt(savedAnnual)}</div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", marginTop: 6 }}>{fmt(savedMonthly)}/mês · {savings.length} decisão{savings.length !== 1 ? "ões" : ""} confirmada{savings.length !== 1 ? "s" : ""}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
                            {largestSaving && (
                                <div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Maior economia</div>
                                    <div style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>
                                        {largestSaving.subscription_name} · <span style={{ color: "#34d399", fontWeight: 700 }}>{fmt(largestSaving.monthly_amount)}/mês</span>
                                    </div>
                                </div>
                            )}
                            {firstDate && (
                                <div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Primeira economia</div>
                                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Mono', monospace" }}>{firstDate}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ height: 1, background: "rgba(16,185,129,0.15)", marginBottom: 20 }} />
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                        Cada valor abaixo representa uma decisão real. O RecurringRadar identificou a oportunidade e você agiu.
                    </div>
                </div>
            )}

            {/* ── Empty state ── */}
            {savings.length === 0 && (
                <div style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: isMobile ? 24 : 36,
                    textAlign: "center", marginBottom: isMobile ? 20 : 28,
                }}>
                    <div style={{ fontSize: 40, marginBottom: 14 }}>💰</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
                        Nenhuma economia confirmada ainda.
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", lineHeight: 1.75, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
                        Quando você agir em uma recomendação do Radar, o valor recuperado ficará registrado aqui como prova permanente do que o RecurringRadar fez por você.
                    </div>
                    <button onClick={() => setPage("radar")} style={{
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                        borderRadius: 10, color: "#fff", padding: "11px 24px", cursor: "pointer",
                        fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                        boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
                    }}>
                        Ver prioridade do dia →
                    </button>
                </div>
            )}

            {/* ── Timeline ── */}
            {months.length > 0 && (
                <div style={{ marginBottom: isMobile ? 28 : 40 }}>
                    {months.map(month => (
                        <div key={month} style={{ marginBottom: 24 }}>
                            <div style={{
                                fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace",
                                letterSpacing: 2, textTransform: "uppercase", marginBottom: 10,
                                display: "flex", alignItems: "center", gap: 10,
                            }}>
                                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                                {month}
                                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {groupedByMonth[month].map((s: any) => {
                                    const meta = actionMeta[s.action_type] ?? { icon: "✓", label: s.action_type, color: "#818cf8" };
                                    const today = isToday(s.confirmed_at);
                                    return (
                                        <div key={s.id} style={{
                                            background: today ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
                                            border: `1px solid ${today ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
                                            borderLeft: `3px solid ${meta.color}`,
                                            borderRadius: "0 10px 10px 0",
                                            padding: "12px 16px",
                                            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                                        }}>
                                            <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
                                            <div style={{ flex: 1, minWidth: 120 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{s.subscription_name}</span>
                                                    <span style={{ fontSize: 10, color: meta.color, fontFamily: "'DM Mono', monospace", background: `${meta.color}18`, padding: "2px 7px", borderRadius: 5 }}>{meta.label}</span>
                                                    {today && <span style={{ fontSize: 10, color: "#34d399", fontFamily: "'DM Mono', monospace", background: "rgba(52,211,153,0.12)", padding: "2px 7px", borderRadius: 5 }}>Hoje</span>}
                                                </div>
                                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginTop: 3 }}>
                                                    {new Date(s.confirmed_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", fontFamily: "'DM Mono', monospace" }}>{fmt(s.monthly_amount)}/mês</div>
                                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{fmt(s.annual_amount)}/ano</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Divider: spending analysis ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: isMobile ? 20 : 28 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>Análise de gastos atual</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* ── Spending analysis (context) ── */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Gasto por Categoria</div>
                    {byCategory.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>Nenhuma assinatura</div>}
                    {byCategory.map((c: any, i: number) => {
                        const barColors = ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
                        return (
                            <div key={c.name} style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{c.name}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmt(c.total)}</span>
                                </div>
                                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${(c.total / maxVal) * 100}%`, height: "100%", background: barColors[i % barColors.length], borderRadius: 4, transition: "width 0.8s ease" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Resumo Financeiro</div>
                        {[
                            ["Gasto mensal atual",    fmt(currentMonthly)],
                            ["Gasto trimestral",      fmt(currentMonthly * 3)],
                            ["Gasto anual projetado", fmt(currentMonthly * 12)],
                            ["Custo por usuário/mês", totalSeats > 0 ? fmt(currentMonthly / totalSeats) : "—"],
                            ["Ainda recuperável",     fmt(wasteCost(subs))],
                        ].map(([l, v]: any) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>{l}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{v}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, padding: 20 }}>
                        <div style={{ fontSize: 12, color: "#a5b4fc", fontFamily: "'DM Mono', monospace", fontWeight: 600, marginBottom: 6 }}>Ainda em jogo</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#818cf8", fontFamily: "'DM Mono', monospace" }}>{fmt(wasteCost(subs))}/mês</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 4, marginBottom: 16 }}>{fmt(wasteCost(subs) * 12)}/ano recuperável</div>
                        <button onClick={() => setPage("radar")} style={{
                            background: "transparent", border: "1px solid rgba(99,102,241,0.3)",
                            borderRadius: 8, color: "#818cf8", padding: "8px 14px", cursor: "pointer",
                            fontFamily: "'DM Mono', monospace", fontSize: 11,
                        }}>
                            Ver prioridade do dia →
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Top Gastos</div>
                    {[...subs].sort((a: any, b: any) => b.price - a.price).slice(0, 5).map((s: any, i: number) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", minWidth: 16 }}>#{i + 1}</span>
                            <span style={{ fontSize: 18 }}>{s.logo_url || "📦"}</span>
                            <span style={{ flex: 1, fontSize: 13, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{s.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{fmt(s.price)}</span>
                        </div>
                    ))}
                    {subs.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>Nenhuma assinatura</div>}
                </div>

                <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Uso nos Últimos 30 Dias</div>
                    {[...subs].sort((a: any, b: any) => a.usage_score - b.usage_score).slice(0, 5).map((s: any) => (
                        <div key={s.id} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "'DM Mono', monospace" }}>{s.logo_url || "📦"} {s.name}</span>
                                {s.usage_score < 20 && <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "2px 6px", borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>CANCELAR</span>}
                            </div>
                            <UsageBar score={s.usage_score} />
                        </div>
                    ))}
                    {subs.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>Nenhuma assinatura</div>}
                </div>
            </div>
        </div>
    );
}

function Settings({ isMobile, user, updateProfile, updatePassword, plan, onUpgrade }: any) {
    const inputStyle: any = {
        width: "100%", padding: "10px 14px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
        color: "#f1f5f9", fontFamily: "'DM Mono', monospace", fontSize: 13,
        outline: "none", boxSizing: "border-box",
    };

    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
    const [company, setCompany] = useState(user?.user_metadata?.company || "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState("");

    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdSaved, setPwdSaved] = useState(false);
    const [pwdError, setPwdError] = useState("");

    const [notifs, setNotifs] = useState({
        unusedAlerts: true,
        renewalWarning: true,
        weeklyReport: false,
        budgetAlerts: true,
    });

    const userInitials = (user?.user_metadata?.full_name || user?.email || "U")
        .split(/[\s@.]+/)
        .filter(Boolean)
        .map((p: string) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleSaveProfile = async () => {
        setSaving(true);
        setSaveError("");
        try {
            await updateProfile(fullName, company);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePwd = async () => {
        if (newPwd.length < 6) { setPwdError("Mínimo 6 caracteres"); return; }
        if (newPwd !== confirmPwd) { setPwdError("As senhas não coincidem"); return; }
        setPwdSaving(true);
        setPwdError("");
        try {
            await updatePassword(newPwd);
            setPwdSaved(true);
            setNewPwd("");
            setConfirmPwd("");
            setTimeout(() => setPwdSaved(false), 3000);
        } catch (err) {
            setPwdError(err instanceof Error ? err.message : "Erro ao alterar senha");
        } finally {
            setPwdSaving(false);
        }
    };

    const notifItems = [
        { key: "unusedAlerts" as const, label: "Alertas de assinatura não usada" },
        { key: "renewalWarning" as const, label: "Aviso de renovação (14 dias antes)" },
        { key: "weeklyReport" as const, label: "Relatório semanal por email" },
        { key: "budgetAlerts" as const, label: "Alertas de gasto acima do orçamento" },
    ];

    const pwdBorder = (val: string, other: string) =>
        val && other ? (val === other ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)") : "rgba(255,255,255,0.1)";

    return (
        <div style={{ padding: isMobile ? "20px 16px" : "32px 36px", maxWidth: 620 }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>Conta</div>
                <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", margin: 0 }}>Configurações</h1>
            </div>

            {/* Perfil */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>Perfil</div>
                <div style={{ display: "flex", gap: 16, marginBottom: 16, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "center" : "flex-start" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{userInitials}</div>
                    <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome completo" style={inputStyle} />
                        <input value={user?.email || ""} readOnly style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
                        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Empresa" style={inputStyle} />
                    </div>
                </div>
                {saveError && <div style={{ fontSize: 12, color: "#f87171", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>{saveError}</div>}
                <button onClick={handleSaveProfile} disabled={saving} style={{
                    background: saved ? "rgba(34,197,94,0.2)" : saving ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    border: saved ? "1px solid rgba(34,197,94,0.4)" : "none",
                    borderRadius: 10, color: saved ? "#4ade80" : "#fff",
                    padding: "10px 22px", cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, transition: "all 0.3s",
                }}>{saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar Perfil"}</button>
            </div>

            {/* Alterar senha */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>Alterar Senha</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input
                        type="password"
                        value={newPwd}
                        onChange={e => { setNewPwd(e.target.value); setPwdError(""); }}
                        placeholder="Nova senha (mínimo 6 caracteres)"
                        style={{ ...inputStyle, borderColor: pwdBorder(newPwd, confirmPwd) }}
                    />
                    <input
                        type="password"
                        value={confirmPwd}
                        onChange={e => { setConfirmPwd(e.target.value); setPwdError(""); }}
                        placeholder="Confirmar nova senha"
                        style={{ ...inputStyle, borderColor: pwdBorder(confirmPwd, newPwd) }}
                    />
                    {pwdError && <div style={{ fontSize: 12, color: "#f87171", fontFamily: "'DM Mono', monospace" }}>{pwdError}</div>}
                    {pwdSaved && <div style={{ fontSize: 12, color: "#4ade80", fontFamily: "'DM Mono', monospace" }}>✓ Senha alterada com sucesso!</div>}
                </div>
                <button onClick={handleChangePwd} disabled={pwdSaving || !newPwd} style={{
                    background: pwdSaving ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    border: "none", borderRadius: 10, color: "#fff",
                    padding: "10px 22px", cursor: (!newPwd || pwdSaving) ? "not-allowed" : "pointer",
                    fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                    marginTop: 12, opacity: !newPwd ? 0.5 : 1,
                }}>{pwdSaving ? "Alterando..." : "Alterar Senha"}</button>
            </div>

            {/* Notificações */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>Notificações</div>
                {notifItems.map(({ key, label }) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Mono', monospace", flex: 1, marginRight: 12 }}>{label}</span>
                        <button onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))} style={{
                            width: 40, height: 22, borderRadius: 11, border: "none", flexShrink: 0,
                            background: notifs[key] ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)",
                            cursor: "pointer", position: "relative", transition: "background 0.2s"
                        }}>
                            <div style={{ position: "absolute", top: 3, left: notifs[key] ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Plano */}
            {plan === 'free' ? (
                <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc", fontFamily: "'DM Mono', monospace" }}>Plano Free</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>Até 3 assinaturas monitoradas</div>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>Gratuito</div>
                    </div>
                    <div style={{ height: 1, background: "rgba(99,102,241,0.12)", marginBottom: 16 }} />
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace", lineHeight: 1.7, marginBottom: 16 }}>
                        Ative o Pro para monitorar assinaturas ilimitadas e recuperar ainda mais com o Radar.
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>
                            R$34,90<span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>/mês</span>
                        </div>
                        <button onClick={onUpgrade} style={{
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none",
                            borderRadius: 10, color: "#fff", padding: "10px 20px", cursor: "pointer",
                            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
                            boxShadow: "0 4px 18px rgba(99,102,241,0.35)",
                        }}>
                            Ativar Pro →
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc", fontFamily: "'DM Mono', monospace" }}>Plano Pro Ativo</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>Assinaturas ilimitadas · Importação ilimitada</div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>R$34,90/mês</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── APP ROOT ────────────────────────────────────────────────

export default function App() {
    const { user, loading, signOut, isPasswordRecovery, updateProfile, updatePassword } = useAuth();
    const { subs, addSubscription, batchAddSubscriptions, updateSubscription, deleteSubscription } = useSubscriptions(user);
    const { recommendations, summary, dismissRecommendation, snoozeRecommendation } = useRecommendations(subs, user?.id);
    const { savings, totalMonthly: savedMonthly, totalAnnual: savedAnnual, recordSaving } = useSavings(user?.id);
    const [planRefreshTrigger, setPlanRefreshTrigger] = useState(0);
    const { plan, canAddMore, subsRemaining } = usePlan(user?.id, subs.length, planRefreshTrigger);
    const [page, setPage] = useState("radar");
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
    const [showGlobalUpgrade, setShowGlobalUpgrade] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { isMobile, isTablet } = useWindowSize();

    useEffect(() => {
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;0,700&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }, []);

    useEffect(() => {
        if (isTablet && !isMobile) setCollapsed(true);
        else if (!isTablet) setCollapsed(false);
    }, [isTablet, isMobile]);

    // Detect Stripe Checkout redirect (?upgrade=success)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("upgrade") !== "success") return;
        window.history.replaceState({}, "", window.location.pathname);
        setShowUpgradeBanner(true);
        // Single re-fetch after 3s — time for Stripe webhook to fire and update DB
        const t = window.setTimeout(() => setPlanRefreshTrigger(n => n + 1), 3000);
        return () => window.clearTimeout(t);
    }, []);

    // Auto-dismiss banner: 4s after plan becomes pro, or 15s max
    useEffect(() => {
        if (!showUpgradeBanner) return;
        const delay = plan === "pro" ? 4000 : 15000;
        const t = window.setTimeout(() => setShowUpgradeBanner(false), delay);
        return () => window.clearTimeout(t);
    }, [showUpgradeBanner, plan]);

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

    if (isPasswordRecovery) {
        return <ResetPassword onSuccess={() => setPage("radar")} />;
    }

    if (!user) {
        return <Login onLoginSuccess={() => setPage("radar")} />;
    }

    const pageProps = { isMobile, isTablet };

    const pages: any = {
        radar: <Radar subs={subs} recommendations={recommendations} summary={summary} savedMonthly={savedMonthly} savedAnnual={savedAnnual} recordSaving={recordSaving} updateSubscription={updateSubscription} dismissRecommendation={dismissRecommendation} snoozeRecommendation={snoozeRecommendation} setPage={setPage} user={user} {...pageProps} />,
        subscriptions: <Subscriptions subs={subs} addSubscription={addSubscription} updateSubscription={updateSubscription} deleteSubscription={deleteSubscription} recommendations={recommendations} setPage={setPage} plan={plan} canAddMore={canAddMore} subsRemaining={subsRemaining} {...pageProps} />,
        opportunities: <Opportunities subs={subs} recommendations={recommendations} summary={summary} recordSaving={recordSaving} updateSubscription={updateSubscription} dismissRecommendation={dismissRecommendation} snoozeRecommendation={snoozeRecommendation} setPage={setPage} {...pageProps} />,
        impact: <Impact subs={subs} savings={savings} savedMonthly={savedMonthly} savedAnnual={savedAnnual} setPage={setPage} {...pageProps} />,
        settings: <Settings user={user} updateProfile={updateProfile} updatePassword={updatePassword} plan={plan} onUpgrade={() => setShowGlobalUpgrade(true)} {...pageProps} />,
        import: <ImportWizard subs={subs} batchAddSubscriptions={batchAddSubscriptions} setPage={setPage} planLimit={subsRemaining} {...pageProps} />
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#08080f", color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>

            {/* ── Post-checkout banner ── */}
            {showUpgradeBanner && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
                    background: plan === "pro" ? "rgba(16,185,129,0.92)" : "rgba(99,102,241,0.92)",
                    backdropFilter: "blur(6px)",
                    padding: "13px 20px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                    fontFamily: "'DM Mono', monospace", fontSize: 13,
                }}>
                    <span style={{ color: "#fff", fontWeight: plan === "pro" ? 700 : 400 }}>
                        {plan === "pro"
                            ? "✓ Plano Pro ativo! Assinaturas ilimitadas desbloqueadas."
                            : "Verificando pagamento... O Radar será atualizado em instantes."}
                    </span>
                    <button onClick={() => setShowUpgradeBanner(false)} style={{
                        background: "none", border: "none",
                        color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16, padding: "0 4px",
                    }}>✕</button>
                </div>
            )}

            {/* ── Global upgrade modal (triggered from Settings) ── */}
            {showGlobalUpgrade && (
                <UpgradeModal onClose={() => setShowGlobalUpgrade(false)} subsCount={subs.length} />
            )}

            <style>{`
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
                button:hover { filter: brightness(1.1); }
                input::placeholder { color: rgba(255,255,255,0.2); }
                select option { background: #111118; color: #f1f5f9; }
            `}</style>

            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
                    <MobileHeader page={page} user={user} onLogout={signOut} />
                    <main style={{ flex: 1, overflowY: "auto", paddingBottom: 68 }}>
                        {pages[page]}
                    </main>
                    <MobileBottomNav page={page} setPage={setPage} />
                </div>
            ) : (
                <>
                    <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={signOut} plan={plan} />
                    <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
                        {pages[page]}
                    </main>
                </>
            )}
            <WhatsAppButton />
        </div>
    );
}
