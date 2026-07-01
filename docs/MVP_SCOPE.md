# MVP SCOPE — RecurringRadar

Este documento define o que está dentro e fora do MVP.
É um documento de restrição, não de aspiração.
Tudo que não está aqui é explicitamente fora do MVP.

---

## Objetivo do MVP

Provar um único ciclo completo do loop de valor:

```
Usuário cadastra assinaturas
→ Engine identifica desperdício
→ Usuário vê recomendação com valor em reais
→ Usuário executa ação
→ Economia é registrada
→ Dashboard mostra ROI
```

Se esse ciclo funcionar para um único usuário real, o MVP está completo.

---

## Critério de Sucesso do MVP

**Um cliente real, sem ajuda do fundador, consegue:**
1. Criar uma conta e cadastrar pelo menos 5 assinaturas em menos de 10 minutos
2. Ver pelo menos 1 recomendação com valor em reais
3. Executar a ação recomendada (cancelar ou marcar para revisão)
4. Ver a economia registrada no Dashboard

Se qualquer um desses 4 passos falhar ou confundir, o MVP não está pronto.

---

## O que está DENTRO do MVP

### Autenticação (já implementado, precisa de ajustes)
- [x] Cadastro com email e senha
- [x] Login
- [x] Recuperação de senha
- [ ] **FIX:** Settings deve salvar dados reais (nome, empresa)
- [ ] **FIX:** Tela de onboarding para primeiro acesso (estado vazio com guia)

### Gestão de Assinaturas (parcialmente implementado)
- [x] Listar assinaturas
- [x] Adicionar assinatura
- [x] Deletar assinatura
- [ ] **FIX:** Corrigir bug de status ('active' → 'ativo')
- [ ] **NEW:** Editar assinatura existente
- [ ] **NEW:** Modal de confirmação customizado para deletar (substituir window.confirm)
- [ ] **NEW:** Campo de última data de uso editável

### Recommendation Engine (novo — core do MVP)
- [ ] Implementar as 7 regras do Engine
- [ ] Tela "Oportunidades" dedicada com recomendações priorizadas
- [ ] Card de recomendação com: nome, razão, impacto em R$, ações
- [ ] Ação "Confirmar cancelamento" → marca assinatura como cancelada e registra economia
- [ ] Ação "Marcar para revisão" → agenda lembrando 7 dias depois
- [ ] Ação "Dispensar" → esconde recomendação por 30 dias

### Registro de Economia (novo — essencial para retenção)
- [ ] Quando usuário confirma cancelamento: registrar em tabela `savings`
- [ ] Assinatura cancelada fica com status "cancelled" (não some do sistema)
- [ ] Dashboard: card de "Total Economizado" com valor acumulado desde cadastro
- [ ] Dashboard: card de "ROI do RecurringRadar" (economia / preço do plano)

### Dashboard (refatorar)
- [ ] Remover card duplicado "Economia = Desperdício"
- [ ] Adicionar: Total Economizado (acumulado)
- [ ] Adicionar: Oportunidades identificadas (quantidade + valor total)
- [ ] Manter: Gasto mensal, Próximas renovações
- [ ] Estado vazio: guia para cadastrar primeira assinatura

### Banco de Dados (ajustes necessários)
- [ ] Executar SQL corrigido (supabase-schema.sql)
- [ ] Adicionar tabela `savings` para registrar economias realizadas
- [ ] Adicionar tabela `recommendations` para cachear recomendações e ações do usuário

---

## O que está FORA do MVP (explicitamente)

### Fora por complexidade de infraestrutura
- ❌ Emails automáticos (requer Edge Functions, cron, SMTP, templates, unsubscribe LGPD)
- ❌ Notificações push
- ❌ Radar AI / Groq (adicionar após provar o loop sem IA)
- ❌ Supabase Edge Functions

### Fora por prematuridade de produto
- ❌ Importação de CSV (útil, mas não crítico para provar o loop)
- ❌ Exportação PDF/Excel
- ❌ Multiusuário / times
- ❌ Controle de permissões
- ❌ Relatórios históricos (sem histórico ainda)
- ❌ Benchmarking de mercado

### Fora por complexidade técnica
- ❌ Integrações (Google Workspace, Stripe, bancos)
- ❌ API pública
- ❌ Webhooks
- ❌ IA conversacional

### Fora por ser prematura
- ❌ Multiempresa
- ❌ White-label
- ❌ Mobile app nativo

---

## Tabela de Prioridades do MVP

| Tarefa | Tipo | Prioridade | Bloqueia |
|---|---|---|---|
| Corrigir bug de status 'active' vs 'ativo' | BUG | P0 | Engine inteiro |
| Implementar edição de assinatura | FEATURE | P0 | Qualidade dos dados |
| Tabela `savings` no banco | INFRA | P0 | Registro de economia |
| Tela de onboarding (primeiro acesso) | UX | P0 | Conversão de novos usuários |
| Engine — Regra 1 (ZERO_USAGE_60D) | FEATURE | P0 | Loop de valor |
| Engine — Regra 5 (HIGH_VALUE_RENEWAL) | FEATURE | P0 | Loop de valor |
| Tela "Oportunidades" com recomendações | FEATURE | P0 | Loop de valor |
| Ação "Confirmar cancelamento" + registro | FEATURE | P0 | Loop de valor |
| Card de "Total Economizado" no Dashboard | FEATURE | P0 | Retenção |
| Engine — Regras 2, 3, 4, 6, 7 | FEATURE | P1 | Qualidade de recomendações |
| Settings salvando dados reais | FIX | P1 | Credibilidade do produto |
| Modal customizado para deletar | UX | P1 | UX profissional |
| Card de "ROI do RecurringRadar" | FEATURE | P1 | Argumento de renovação |
| Ação "Marcar para revisão" | FEATURE | P2 | Alternativa ao cancelamento |
| Ação "Dispensar por 30 dias" | FEATURE | P2 | Reduzir fricção |

**P0 = sem isso o MVP não funciona**
**P1 = importante mas não bloqueia o loop principal**
**P2 = melhoria de qualidade, entra se houver tempo**

---

## Ordem de Implementação

### Sprint 1 — Corrigir o que está quebrado
1. Bug status 'active' vs 'ativo'
2. Edição de assinatura (modal)
3. Settings com persistência real
4. Modal de confirmação de exclusão customizado

### Sprint 2 — Infraestrutura do Loop
1. Tabela `savings` no banco
2. Status 'cancelled' para assinaturas canceladas
3. Hook `useRecommendations` que roda o Engine
4. Tipos TypeScript do Engine (sem implementação ainda)

### Sprint 3 — Engine Core
1. Implementar Regra 1 (ZERO_USAGE_60D)
2. Implementar Regra 5 (HIGH_VALUE_RENEWAL)
3. Tela "Oportunidades" básica com lista de recomendações
4. Ação "Confirmar cancelamento" com registro em `savings`

### Sprint 4 — Dashboard de ROI
1. Card "Total Economizado" no Dashboard
2. Card "Oportunidades identificadas: X · R$Y/mês"
3. Onboarding para estado vazio

### Sprint 5 — Engine Completo
1. Regras 2, 3, 4, 6, 7
2. EngineSummary com métricas agregadas
3. Ação "Marcar para revisão"
4. Ação "Dispensar"

---

## Definição de "MVP Completo"

O MVP está completo quando:

- [ ] Nenhum bug crítico listado acima está aberto
- [ ] Um usuário novo consegue completar o loop sem ajuda
- [ ] Pelo menos uma recomendação com impacto > R$100/mês é gerada automaticamente
- [ ] A economia registrada aparece no Dashboard
- [ ] O produto está deployado e acessível via URL pública
