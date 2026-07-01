# ECONOMY LOOP — RecurringRadar

O Loop de Economia é o mecanismo central de valor e retenção do produto.
Este documento define cada etapa com precisão para que a implementação seja fiel à visão.

---

## O Loop Completo

```
1. CADASTRO
   Usuário adiciona assinaturas com preço, uso e data de renovação
         ↓
2. ENGINE
   Recommendation Engine analisa dados e identifica desperdícios
         ↓
3. RECOMENDAÇÃO
   Usuário vê "Hotjar · R$890/mês · Sem uso em 74 dias · CANCELAR"
         ↓
4. AÇÃO
   Usuário clica "Confirmar cancelamento" (ou agenda revisão)
         ↓
5. REGISTRO
   Sistema salva: economia de R$890/mês · R$10.680/ano
   Assinatura muda para status 'cancelled'
         ↓
6. ROI VISÍVEL
   Dashboard mostra: "Você economizou R$890 este mês com RecurringRadar"
         ↓
7. EMAIL MENSAL (V1)
   No dia 1: "Em [mês], você recuperou R$X graças ao RecurringRadar"
         ↓
8. RENOVAÇÃO
   O ROI visível é o argumento de renovação. O usuário não cancela.
         ↓
9. EXPANSÃO
   "Quero convidar meu time" → Upgrade de plano
```

---

## Etapa 4 — O Fluxo de Ação com Detalhes

Esta é a etapa mais crítica e mais delicada. Uma ação mal desenhada gera abandono.

### Quando o usuário clica "Confirmar cancelamento"

O sistema não cancela automaticamente a assinatura no fornecedor. Não tem acesso a isso.

O que acontece no sistema:

```
1. Abre modal de confirmação:
   "Você já cancelou o Hotjar ou ainda vai cancelar?"
   
   [Já cancelei]  [Vou cancelar agora]  [Cancelar mais tarde]
   
2. Se "Já cancelei" ou "Vou cancelar agora":
   → Registra R$890/mês em public.savings
   → Atualiza subscription.status = 'cancelled'
   → Mostra: "✓ Economia de R$890/mês registrada"
   
3. Se "Cancelar mais tarde":
   → Cria lembrete (snoozed por 3 dias)
   → Mantém recomendação ativa
```

### Por que não cancelar "dentro do sistema"?

Seria necessário ter a senha do usuário em cada plataforma. Isso é um risco de segurança que não vale para o MVP. O produto registra a intenção e a economia, não executa o cancelamento.

No V2, com integrações via OAuth, isso muda para ferramentas específicas.

---

## Etapa 5 — O que é registrado em `public.savings`

```typescript
{
  user_id: "uuid-do-usuario",
  subscription_id: "uuid-da-assinatura",  // pode ser null se já deletou
  subscription_name: "Hotjar",            // preservado mesmo se deletar
  monthly_amount: 890.00,
  annual_amount: 10680.00,
  action_type: "cancelled",
  recommendation_type: "ZERO_USAGE_60D",
  notes: null,                            // usuário pode adicionar nota opcional
  confirmed_at: "2026-06-27T..."
}
```

---

## Etapa 6 — Como o ROI aparece no Dashboard

### Card principal de economia

```
┌─────────────────────────────────────┐
│ 💰 Total Recuperado                 │
│                                     │
│   R$ 1.780/mês                      │
│   R$ 21.360/ano                     │
│                                     │
│   2 cancelamentos este mês          │
└─────────────────────────────────────┘
```

### Card de ROI do RecurringRadar

```
┌─────────────────────────────────────┐
│ 📊 ROI do RecurringRadar            │
│                                     │
│   Você paga R$149/mês               │
│   Já economizou R$1.780/mês         │
│                                     │
│   Retorno: 11.9x ↑                  │
└─────────────────────────────────────┘
```

O ROI de 11.9x é o argumento de renovação mais forte possível. Nenhum CFO cancela um produto que retorna 11x o investimento.

---

## Medindo o Sucesso do Loop

| Métrica | Como medir | Alvo MVP |
|---|---|---|
| Taxa de conversão do onboarding | % de novos usuários que cadastram 3+ assinaturas | > 70% |
| Tempo até primeira recomendação | Minutos desde cadastro até ver primeira rec | < 5 min |
| Taxa de ação | % de recomendações que viram ações (cancelar/revisar) | > 30% |
| Economia média por usuário/mês | `AVG(monthly_amount)` em public.savings | > R$500 |
| Retenção 30 dias | % de usuários que abrem o produto após 30 dias | > 60% |
| Churn | % que cancela no primeiro mês | < 10% |

---

## O que quebra o Loop

Situações que interrompem o ciclo e geram churn:

1. **Onboarding vazio:** Usuário se cadastra, vê tela em branco sem guia → abandona
2. **Nenhuma recomendação gerada:** Todos os `usage_score` em 80%+ → nada para recomendar
3. **Recomendação sem ação:** Botão "Cancelar" que não faz nada → frustração e abandono
4. **Economia não visível:** Usuário age mas não vê onde a economia foi registrada → perde a sensação de progresso
5. **Email mensal não enviado:** Usuário esquece do produto antes de ver o ROI

Cada um desses pontos de falha tem uma solução específica na implementação.
