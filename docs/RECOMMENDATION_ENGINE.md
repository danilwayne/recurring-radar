# RECOMMENDATION ENGINE — RecurringRadar

O Recommendation Engine é o coração do produto.
É 100% determinístico. Sem IA. Sem randomicidade.
Cada recomendação gerada deve ser explicável, auditável e testável.

---

## Responsabilidade do Engine

**O Engine faz:**
- Analisar os dados das assinaturas
- Aplicar regras de negócio
- Identificar oportunidades de economia
- Calcular impacto financeiro de cada oportunidade
- Gerar recomendações com prioridade, tipo e ações sugeridas

**O Engine NÃO faz:**
- Executar cancelamentos (isso é ação do usuário)
- Enviar emails (isso é responsabilidade da camada de notificação)
- Gerar texto em linguagem natural (isso é responsabilidade do Radar AI)
- Armazenar dados (isso é responsabilidade do banco de dados)

---

## Estrutura de uma Recomendação

```typescript
interface Recommendation {
  id: string                    // UUID gerado pelo engine
  subscription_id: string       // ID da assinatura analisada
  subscription_name: string     // Nome para exibição imediata
  type: RecommendationType      // Categoria da recomendação
  priority: RecommendationPriority  // Urgência
  
  // Impacto financeiro
  monthly_impact: number        // Economia mensal em reais
  annual_impact: number         // monthly_impact * 12
  
  // Contexto para exibição
  reason_code: ReasonCode       // Código da regra que gerou
  reason_text: string           // Texto determinístico da razão
  data_points: DataPoint[]      // Evidências usadas
  
  // Ações disponíveis
  actions: RecommendationAction[]
  
  // Metadados
  confidence: 'high' | 'medium' | 'low'  // Baseado na qualidade dos dados
  generated_at: Date
  expires_at: Date | null       // Null = não expira até dados mudarem
  
  // Preenchido pelo Radar AI (opcional)
  ai_explanation?: string
  ai_priority_reason?: string
}

type RecommendationType = 
  | 'cancel'        // Cancelar assinatura
  | 'downgrade'     // Reduzir plano
  | 'consolidate'   // Consolidar duplicatas
  | 'review'        // Revisar antes de renovar
  | 'renewal_alert' // Renovação próxima sem ação

type RecommendationPriority =
  | 'urgent'   // Ação necessária em menos de 7 dias
  | 'high'     // Alto impacto financeiro (>R$500/mês)
  | 'medium'   // Impacto moderado (R$100–R$500/mês)
  | 'low'      // Baixo impacto ou baixa certeza

type ReasonCode =
  | 'ZERO_USAGE_60D'        // Nenhum uso em 60+ dias
  | 'LOW_USAGE_30D'         // Uso < 20% por 30+ dias
  | 'IDLE_SEATS'            // Mais licenças do que usuários ativos
  | 'CATEGORY_DUPLICATE'    // Duas+ ferramentas na mesma categoria
  | 'HIGH_VALUE_RENEWAL'    // Renovação >R$500 nos próximos 14 dias
  | 'PRICE_INCREASE'        // Preço aumentou >15% desde última revisão
  | 'STALE_DATA'            // Dados não atualizados há >90 dias

interface DataPoint {
  label: string
  value: string | number
  unit?: string
}

interface RecommendationAction {
  id: string
  label: string
  type: 'confirm_cancel' | 'schedule_review' | 'mark_downgrade' | 'snooze' | 'dismiss'
  variant: 'primary' | 'secondary' | 'danger'
}
```

---

## As 7 Regras do Engine

### REGRA 1 — ZERO_USAGE_60D (Ferramenta Zumbi)

**Gatilho:** `usage_score < 10` E (`last_used` é nulo OU `last_used` > 60 dias atrás)

**Prioridade:** `urgent` se renovação < 14 dias, senão `high`

**Impacto:** `price` (100% é recuperável)

**Confiança:** `high` se `last_used` preenchido, `medium` se baseado só em `usage_score`

**Texto:** `"[Nome] não foi usado nos últimos 60+ dias. Cancelar economiza R$X/mês."`

**Ações:** `confirm_cancel`, `snooze`

---

### REGRA 2 — LOW_USAGE_30D (Baixo Uso Crônico)

**Gatilho:** `usage_score >= 10 AND usage_score < 25` por período indeterminado

**Prioridade:** `high` se `price > 300`, senão `medium`

**Impacto:** `price` (presumindo cancelamento total)

**Confiança:** `medium` (score é estimativa)

**Texto:** `"[Nome] tem uso muito baixo ([score]%). Avalie se a equipe realmente precisa desta ferramenta."`

**Ações:** `confirm_cancel`, `schedule_review`, `dismiss`

---

### REGRA 3 — IDLE_SEATS (Licenças Ociosas)

**Gatilho:** `seats > 1` E `usage_score < 50`

**Cálculo de licenças ociosas:** `Math.floor(seats * (1 - usage_score / 100))`

**Impacto:** `(price / seats) * licenças_ociosas`

**Prioridade:** `high` se impacto > R$300/mês, senão `medium`

**Texto:** `"Você contratou [N] licenças do [Nome] mas apenas ~[M] estão sendo usadas. Reduzir para [M] licenças economiza ~R$X/mês."`

**Ações:** `mark_downgrade`, `schedule_review`

---

### REGRA 4 — CATEGORY_DUPLICATE (Duplicata por Categoria)

**Gatilho:** Existem 2 ou mais assinaturas na mesma categoria

**Cálculo:** Agrupa por `category`. Se grupo tem > 1, gera recomendação para todas as assinaturas do grupo

**Impacto:** Soma de todas menos a de maior `usage_score` (presumindo manter a mais usada)

**Prioridade:** `high` se custo combinado > R$500/mês, senão `medium`

**Texto:** `"Você paga por [N] ferramentas de [Categoria]: [Nome1] e [Nome2]. Custo combinado: R$X/mês. A maioria das empresas usa apenas uma."`

**Ações:** `schedule_review`, `confirm_cancel` (em cada assinatura do grupo)

**Nota:** Esta regra requer lógica extra para detectar duplicatas "semânticas" quando a categoria for a mesma mas os nomes forem diferentes.

---

### REGRA 5 — HIGH_VALUE_RENEWAL (Renovação de Alto Valor)

**Gatilho:** `renew_date` existe E `renew_date <= 14 dias` E `price >= 200`

**Prioridade:** `urgent` se <= 7 dias, `high` se <= 14 dias

**Impacto:** 0 (não é economia direta — é prevenção de gasto não revisado)

**Texto:** `"[Nome] renova em [N] dias por R$X. Última chance de revisar antes do débito automático."`

**Ações:** `schedule_review`, `confirm_cancel`, `snooze` (7 dias)

---

### REGRA 6 — PRICE_INCREASE (Aumento de Custo)

**Gatilho:** Detectado quando usuário edita o `price` para valor > 15% acima do valor anterior

**Implementação:** Armazenar `previous_price` na edição. Se `new_price > previous_price * 1.15`, gerar recomendação.

**Prioridade:** `high`

**Texto:** `"O custo do [Nome] aumentou de R$X para R$Y (+[%]%). Isso representa R$Z/ano a mais. Revise se houve mudança de plano ou reajuste contratual."`

**Ações:** `schedule_review`, `dismiss`

---

### REGRA 7 — STALE_DATA (Dados Desatualizados)

**Gatilho:** `usage_score` existe E o `updated_at` da assinatura > 90 dias atrás

**Propósito:** Alertar que as recomendações podem estar desatualizadas

**Prioridade:** `low`

**Impacto:** 0 (é alerta de qualidade de dados)

**Texto:** `"As informações do [Nome] não são atualizadas há [N] dias. Revise os dados para garantir recomendações precisas."`

**Ações:** `schedule_review`

---

## Lógica de Execução do Engine

```typescript
function runEngine(subscriptions: Subscription[]): Recommendation[] {
  const recommendations: Recommendation[] = []
  
  // Regras individuais (por assinatura)
  for (const sub of subscriptions) {
    recommendations.push(...applyRule1_ZeroUsage(sub))
    recommendations.push(...applyRule2_LowUsage(sub))
    recommendations.push(...applyRule3_IdleSeats(sub))
    recommendations.push(...applyRule5_HighValueRenewal(sub))
    recommendations.push(...applyRule6_PriceIncrease(sub))
    recommendations.push(...applyRule7_StaleData(sub))
  }
  
  // Regras cruzadas (entre assinaturas)
  recommendations.push(...applyRule4_CategoryDuplicate(subscriptions))
  
  // Deduplicar: mesma assinatura não gera dois recommendations do mesmo tipo
  const deduped = deduplicateRecommendations(recommendations)
  
  // Ordenar: urgent > high > medium > low, dentro de cada prioridade por impacto
  return sortRecommendations(deduped)
}
```

---

## Cálculo de Confiança

A confiança de uma recomendação depende da qualidade dos dados:

| Situação dos dados | Confiança |
|---|---|
| `usage_score` atualizado < 30 dias + `last_used` preenchido | `high` |
| `usage_score` atualizado 30–90 dias | `medium` |
| `usage_score` atualizado > 90 dias OU nunca preenchido | `low` |

Recomendações com confiança `low` ainda aparecem, mas com aviso visual: *"Dados desatualizados — atualize para maior precisão."*

---

## Métricas do Engine

O Engine deve retornar um sumário além das recomendações individuais:

```typescript
interface EngineSummary {
  total_recommendations: number
  urgent_count: number
  total_monthly_impact: number   // Soma de todos os impactos mensais
  total_annual_impact: number    // total_monthly_impact * 12
  top_opportunity: Recommendation | null  // Maior impacto individual
  data_quality_score: number     // % de assinaturas com dados confiáveis
}
```

O `total_monthly_impact` é o número que aparece em destaque no Dashboard:
**"Identificamos R$ X.XXX em oportunidades de economia este mês"**

---

## O que o Engine NÃO fará (restrições explícitas)

- Não vai cancelar assinaturas automaticamente
- Não vai enviar emails (responsabilidade de outra camada)
- Não vai aprender com feedback do usuário (isso requer ML, não está no escopo)
- Não vai comparar preços com benchmarks de mercado (V3)
- Não vai acessar APIs externas de ferramentas (V2)
