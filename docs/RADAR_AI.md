# RADAR AI — RecurringRadar

Radar AI é a camada de comunicação do produto.
Ela não decide nada. Ela explica e prioriza.
Usa Groq como provedor de inferência por sua latência baixa e custo reduzido.

---

## Posicionamento Correto da IA

### O que a IA FAZ

- Transforma saídas técnicas do Engine em linguagem natural compreensível para um CFO
- Escreve resumos executivos do estado das assinaturas
- Prioriza recomendações considerando contexto conjunto (ex: "cancele este antes daquele porque renova primeiro")
- Gera o texto de emails automáticos com tom profissional e personalizado
- Responde perguntas em linguagem natural sobre os dados do usuário (V2)

### O que a IA NÃO FAZ

- **Não decide** se uma assinatura deve ser cancelada (o Engine decide)
- **Não inventa** dados que não existem nas assinaturas
- **Não opera** sem dados do Engine — sempre recebe a saída estruturada primeiro
- **Não bloqueia** o produto — se a API falhar, o produto funciona sem ela

### Por que Groq especificamente

Groq usa LPU (Language Processing Unit), não GPU. O resultado é inferência consistentemente rápida (< 500ms) com custo baixo. Para geração de explicações de recomendações, onde o usuário está aguardando a resposta, latência importa.

Modelo recomendado: `llama-3.1-8b-instant` para explicações de recomendações individuais. `llama-3.3-70b-versatile` para resumos executivos completos (chamadas menos frequentes).

---

## Quando Radar AI é Chamado

```
Engine gera recomendações
         ↓
[Chamada ao Groq — assíncrona, não bloqueia UI]
         ↓
UI mostra recomendações imediatamente (com texto determinístico)
         ↓
Quando Groq responde, substitui texto determinístico pelo AI text
         ↓
Se Groq falha, UI mantém texto determinístico sem erro visível
```

A IA nunca está no caminho crítico de renderização. O usuário vê recomendações instantaneamente. A explicação da IA aparece em 1–2 segundos adicionais.

---

## Casos de Uso

### Caso 1 — Explicação de Recomendação Individual

**Input para Groq:**
```
Contexto: Sistema de gestão de assinaturas SaaS para empresas.
Você é o Radar AI, assistente de economia do RecurringRadar.
Seja direto, profissional e focado em economia. Máximo 2 frases.

Recomendação gerada pelo sistema:
- Tipo: CANCELAMENTO
- Ferramenta: Hotjar
- Categoria: Analytics
- Preço mensal: R$890
- Usage score: 3%
- Dias sem acesso: 74
- Próxima renovação: 9 dias

Escreva uma explicação clara e acionável desta recomendação para um CFO.
```

**Output esperado:**
```
"Hotjar está sendo cobrado mensalmente mas praticamente ninguém acessa — apenas 3% de uso nos últimos meses e zero acessos há 74 dias. Com a renovação em 9 dias, agir agora evita mais um débito de R$890 e economiza R$10.680 por ano."
```

---

### Caso 2 — Resumo Executivo (Weekly Summary)

**Input para Groq:**
```
Contexto: Resumo semanal de economia para o CFO da empresa.
Tom: profissional, direto, focado em dinheiro.

Dados do Engine:
- Total de assinaturas: 23
- Oportunidades identificadas: 5
- Economia potencial total: R$4.200/mês
- Mais urgente: Zoom ($1.200/mês, renova em 3 dias, uso 8%)
- Economia já realizada no mês: R$1.890 (2 cancelamentos)

Escreva um resumo executivo de 3 parágrafos curtos para email.
```

---

### Caso 3 — Priorização de Múltiplas Recomendações

**Input para Groq:**
```
[Lista de 8 recomendações do Engine com tipos, impactos e urgências]

Ordene estas recomendações por ordem de impacto prático para a empresa,
considerando: urgência da renovação, valor em risco e facilidade de ação.
Explique em uma frase por que cada uma está na sua posição.
```

---

## Implementação Técnica

### Instalação

```bash
npm install groq-sdk
```

### Variável de ambiente

```env
VITE_GROQ_API_KEY=gsk_...
```

**Atenção:** A chave Groq no frontend (VITE_) é visível no bundle. Para produção, as chamadas ao Groq devem ser feitas via Supabase Edge Function, não diretamente do browser.

### Estrutura do módulo

```
src/
  lib/
    radarAI.ts       ← cliente Groq + funções de prompt
  hooks/
    useRadarAI.ts    ← hook React que chama radarAI.ts
```

### radarAI.ts — estrutura base

```typescript
import Groq from 'groq-sdk'
import { Recommendation, EngineSummary } from '../types/engine'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true  // Apenas para desenvolvimento
})

const MODEL_FAST = 'llama-3.1-8b-instant'
const MODEL_SMART = 'llama-3.3-70b-versatile'

export async function explainRecommendation(rec: Recommendation): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt()
        },
        {
          role: 'user',
          content: buildRecommendationPrompt(rec)
        }
      ],
      max_tokens: 150,
      temperature: 0.3  // Baixa temperatura = mais consistente, menos criativo
    })
    
    return completion.choices[0]?.message?.content ?? rec.reason_text
  } catch {
    // Falha silenciosa — retorna texto determinístico do Engine
    return rec.reason_text
  }
}

export async function generateExecutiveSummary(
  summary: EngineSummary,
  topRecommendations: Recommendation[]
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_SMART,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt()
        },
        {
          role: 'user',
          content: buildSummaryPrompt(summary, topRecommendations)
        }
      ],
      max_tokens: 400,
      temperature: 0.4
    })
    
    return completion.choices[0]?.message?.content ?? generateFallbackSummary(summary)
  } catch {
    return generateFallbackSummary(summary)
  }
}

function buildSystemPrompt(): string {
  return `Você é o Radar AI, assistente de economia do RecurringRadar.
Sua função é explicar oportunidades de economia de forma clara e direta para CFOs e gestores financeiros.
Seja profissional, objetivo e focado em números reais.
Nunca invente dados. Apenas use as informações fornecidas.
Responda sempre em português brasileiro.
Não use markdown. Escreva texto simples.`
}
```

---

## Limites e Guardrails

O Radar AI opera com restrições explícitas para evitar respostas prejudiciais:

1. **Temperature ≤ 0.4** — reduz criatividade excessiva e alucinações
2. **max_tokens limitado** — respostas curtas e objetivas
3. **Fallback sempre disponível** — se Groq falhar, texto determinístico aparece
4. **Sem acesso a dados externos** — o modelo só vê o que o prompt inclui
5. **Validação de saída** — se a resposta contiver valores monetários diferentes dos enviados no prompt, descarta e usa fallback

---

## Decisão de Arquitetura — Frontend vs. Backend

### MVP (atual): Chamada direta do browser

Prós: simples de implementar
Contras: chave API exposta no bundle

**Aceitável para MVP com early adopters.** Não aceitável para produto público.

### V1.1: Supabase Edge Function

```
Browser → Supabase Edge Function → Groq → Edge Function → Browser
```

A Edge Function recebe os dados das recomendações, chama Groq com a chave segura no servidor, e retorna o texto. A chave Groq nunca chega ao browser.

---

## Estimativa de Custo

Com `llama-3.1-8b-instant` no Groq:

| Operação | Tokens estimados | Custo estimado |
|---|---|---|
| Explicação de 1 recomendação | ~300 tokens | ~$0.0001 |
| Resumo executivo completo | ~800 tokens | ~$0.0003 |
| Usuário ativo por mês (50 chamadas) | ~15.000 tokens | ~$0.005 |
| 100 usuários ativos por mês | 1.5M tokens | ~$0.50 |

O custo de Groq é praticamente irrelevante no estágio inicial. Passa a ser relevante acima de 10.000 usuários ativos.

---

## MVP vs. Versões Futuras

### MVP — Radar AI NÃO entra

O produto de MVP não inclui Groq. O Engine gera textos determinísticos suficientemente claros. Groq adiciona complexidade sem ser crítico para a prova de valor.

### V1.1 — Radar AI entra como enhancement

Após o loop de economia estar funcionando e validado com usuários reais, Groq é adicionado como camada de melhoria da comunicação.

### V2 — Radar AI como chat (consulta em linguagem natural)

O usuário digita: "Quais ferramentas posso cancelar sem impactar o time de marketing?"
O sistema usa Groq + dados das assinaturas filtradas por responsável/departamento para responder.
