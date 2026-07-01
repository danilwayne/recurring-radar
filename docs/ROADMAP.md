# ROADMAP — RecurringRadar

Cada fase tem um critério de saída claro.
Não avançar para a próxima fase sem validar o critério da atual.

---

## Fase 0 — Estabilização (agora)

**Objetivo:** Produto sem bugs críticos. Base sólida para construir.

**Duração estimada:** 1 semana

### Tarefas

| Tarefa | Tipo | Arquivo |
|---|---|---|
| Corrigir bug de status 'active' vs 'ativo' | BUG | `App.tsx`, `useSubscriptions.ts` |
| Implementar edição de assinatura (modal) | FEATURE | `App.tsx` |
| Settings salvar nome e empresa no banco | FIX | `Settings`, `useAuth.ts` |
| Alterar senha dentro de Configurações | FEATURE | `Settings`, `useAuth.ts` |
| Deletar conta (LGPD) | FEATURE | `Settings`, `useAuth.ts` |
| Substituir `window.confirm` por modal próprio | UX | Novo `ConfirmModal.tsx` |
| Corrigir hooks dentro de `.map()` no Settings | BUG | `Settings` |
| Executar SQL atualizado no Supabase | INFRA | `supabase-schema.sql` |
| Adicionar tabelas `savings` e `recommendation_actions` | INFRA | SQL novo |

**Critério de saída:** Nenhum bug P0 aberto. Settings funcional. Produto utilizável por um usuário real sem instrução.

---

## Fase 1 — MVP: Loop de Economia

**Objetivo:** Um usuário completa o ciclo completo: cadastra → vê recomendação → age → vê economia.

**Duração estimada:** 2–3 semanas

### Sprint 1A — Engine Core

| Tarefa | Arquivo |
|---|---|
| Criar `src/types/recommendation.ts` | novo |
| Criar `src/types/savings.ts` | novo |
| Criar `src/engine/index.ts` com `runEngine()` | novo |
| Implementar Regra 1: ZERO_USAGE_60D | `engine/rules/rule1.ts` |
| Implementar Regra 5: HIGH_VALUE_RENEWAL | `engine/rules/rule5.ts` |
| Criar hook `useRecommendations` | `hooks/useRecommendations.ts` |

### Sprint 1B — Tela de Oportunidades

| Tarefa | Arquivo |
|---|---|
| Criar página `Opportunities.tsx` | novo |
| Criar componente `RecommendationCard.tsx` | novo |
| Implementar ação "Confirmar cancelamento" | `Opportunities.tsx` |
| Criar hook `useSavings` | `hooks/useSavings.ts` |
| Registrar saving em `public.savings` | `useSavings.ts` |
| Atualizar status da assinatura para 'cancelled' | `useSubscriptions.ts` |

### Sprint 1C — Dashboard de ROI

| Tarefa | Arquivo |
|---|---|
| Adicionar card "Total Economizado" no Dashboard | `pages/Dashboard.tsx` |
| Adicionar card "Oportunidades identificadas" | `pages/Dashboard.tsx` |
| Remover card duplicado "Economia = Desperdício" | `pages/Dashboard.tsx` |
| Criar tela de onboarding (estado vazio) | `components/EmptyState.tsx` |

### Sprint 1D — Engine Completo

| Tarefa | Arquivo |
|---|---|
| Implementar Regra 2: LOW_USAGE_30D | `engine/rules/rule2.ts` |
| Implementar Regra 3: IDLE_SEATS | `engine/rules/rule3.ts` |
| Implementar Regra 4: CATEGORY_DUPLICATE | `engine/rules/rule4.ts` |
| Implementar Regra 6: PRICE_INCREASE | `engine/rules/rule6.ts` |
| Implementar Regra 7: STALE_DATA | `engine/rules/rule7.ts` |
| Adicionar ações "Dispensar" e "Marcar para revisão" | `Opportunities.tsx` |

**Critério de saída:** Pelo menos 1 usuário beta confirma economia > R$200/mês usando o produto.

---

## Fase 2 — V1: Alcance e Automação

**Objetivo:** O produto notifica o usuário sem que ele precise abrir o app.

**Duração estimada:** 3–4 semanas

### V1.1 — Radar AI (Groq)

| Tarefa | Arquivo |
|---|---|
| Criar `src/lib/radarAI.ts` | novo |
| Hook `useRadarAI` para explicações | `hooks/useRadarAI.ts` |
| Integrar AI explanation no `RecommendationCard` | `components/RecommendationCard.tsx` |
| Mover chamadas Groq para Supabase Edge Function | `supabase/functions/radar-ai/` |
| Gerar resumo executivo semanal via Groq | `lib/radarAI.ts` |

### V1.2 — Emails Automáticos

| Tarefa | Arquivo |
|---|---|
| Configurar Resend como provedor SMTP | Supabase Dashboard |
| Edge Function: alerta de renovação (7 dias antes) | `supabase/functions/renewal-alert/` |
| Edge Function: resumo semanal de oportunidades | `supabase/functions/weekly-digest/` |
| Edge Function: email mensal de economia realizada | `supabase/functions/monthly-report/` |
| Template HTML de email responsivo | `supabase/functions/templates/` |
| Fluxo de unsubscribe (obrigação LGPD) | `supabase/functions/unsubscribe/` |

### V1.3 — Importação e Exportação

| Tarefa | Arquivo |
|---|---|
| Importação via CSV (nome, preço, categoria) | `components/ImportCSV.tsx` |
| Exportação do relatório em PDF | `pages/Reports.tsx` |
| Exportação da lista de assinaturas em Excel | `pages/Subscriptions.tsx` |

### V1.4 — Qualidade de Produto

| Tarefa | Arquivo |
|---|---|
| Migrar App.tsx monolítico para pasta `pages/` | refatoração |
| Eliminar todos os `any` com tipos explícitos | geral |
| Adicionar React Router (substituir `page` useState) | geral |
| Adicionar atributos básicos de acessibilidade (aria-*) | geral |

**Critério de saída:** 10 clientes ativos com economia documentada. MRR > R$0.

---

## Fase 3 — V2: Colaboração e Integrações

**Objetivo:** Empresas com times usam o produto colaborativamente.

**Duração estimada:** 4–6 semanas

### Multiusuário

- Organizações (uma empresa = uma conta)
- Convidar membros da equipe
- Papéis: Admin, Editor, Viewer
- Aprovação de cancelamentos (workflow)

### Integrações de Alto Valor

- Google Workspace: detectar apps instalados e licenças ativas
- Microsoft 365: idem
- Importação de extrato de cartão (OFX)
- Stripe: detectar assinaturas via webhook

### Melhorias de Produto

- Calendário de renovações
- Histórico de gastos (comparação mensal)
- Metas de economia com progresso
- Centro de custos (vincular assinatura a departamento/time)
- Categorias personalizadas

**Critério de saída:** Churn < 5% ao mês. NPS > 40.

---

## Fase 4 — V3: Referência de Mercado

**Objetivo:** Ser a ferramenta de referência para gestão de SaaS spend no Brasil.

### IA Avançada

- Consulta em linguagem natural: "Mostre tudo que o marketing usa e custa mais de R$500"
- Previsão de desperdício futuro baseada em tendência de uso
- Sugestão de downgrade com análise de features usadas vs. features do plano

### Dados e Benchmarking

- Score de eficiência anônimo vs. empresas do mesmo setor
- "Empresas como a sua gastam X% menos em analytics"
- Relatório de maturidade de gestão de SaaS

### Expansão

- API pública com documentação
- Webhook para integrar com ERPs
- White-label para consultorias financeiras
- Marketplace de integrações com parceiros

---

## O que definitivamente NÃO entra no roadmap

Estas funcionalidades foram consideradas e explicitamente descartadas por não passarem no filtro "Isso ajuda o cliente a recuperar dinheiro?":

- ❌ Temas de cores customizáveis
- ❌ PWA offline
- ❌ Gamificação (badges, streaks)
- ❌ Comentários nas assinaturas
- ❌ Integração com Slack apenas para notificações (email cobre isso melhor)
- ❌ Dashboard "social" com comparação entre usuários
