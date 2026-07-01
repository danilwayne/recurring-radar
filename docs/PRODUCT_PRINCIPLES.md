# PRODUCT PRINCIPLES — RecurringRadar

Estes princípios são o filtro de decisão do produto.
Antes de implementar qualquer funcionalidade, aplique estes princípios.
Se a funcionalidade não passar pelo filtro, não entra agora.

---

## Princípio 1 — Economia Primeiro

**"Isso ajuda o cliente a recuperar dinheiro ou tomar uma decisão melhor?"**

Se a resposta for não, ou "talvez", a funcionalidade não entra no sprint atual.

Exemplos de aplicação:
- ✅ Motor de recomendações de cancelamento → sim, gera economia direta
- ✅ Alerta de renovação → sim, previne gasto desnecessário
- ✅ Registro de economia realizada → sim, prova o ROI
- ❌ Temas de cores customizáveis → não, não gera economia
- ❌ Dashboard de "total de assinaturas cadastradas" → não, é informação decorativa
- ⚠️ Gráfico de evolução histórica → depende; se mostrar tendência de desperdício, sim

---

## Princípio 2 — Ação antes de Informação

O produto não existe para mostrar dados. Existe para provocar ações que geram economia.

Para cada tela, pergunte: "Qual ação o usuário vai tomar depois de ver isso?"

Se a resposta for "nenhuma", a tela precisa ser redesenhada.

- Cada recomendação tem um botão de ação claro
- Cada alerta tem um próximo passo definido
- O dashboard mostra o que fazer, não só o que aconteceu

---

## Princípio 3 — Dados Confiáveis antes de Análise Sofisticada

O Engine mais sofisticado gera recomendações inúteis se os dados de entrada forem ruins.

**Antes de construir funcionalidades de análise, garanta que os dados são confiáveis.**

Isso significa:
- Sempre validar dados na entrada (preço positivo, datas válidas, scores no range)
- Indicar visivelmente quando um dado está desatualizado (ex: "usage_score atualizado há 90 dias")
- Priorizar importação de dados (CSV) sobre entrada manual para reduzir erro humano
- Nunca gerar recomendação com confiança alta baseada em dados incompletos

---

## Princípio 4 — Simplifique, não enfeite

Cada funcionalidade adicionada aumenta a complexidade para o usuário e para o código.

Regras de simplificação:
- Uma tela, uma decisão principal
- Um card de recomendação, uma ação recomendada
- Um email, um call-to-action
- Se precisa de tutorial para explicar, simplifica antes de lançar

---

## Princípio 5 — ROI visível a qualquer momento

O usuário precisa saber, a qualquer momento, quanto já economizou usando o RecurringRadar.

Esse número é o argumento de renovação. É o que impede o churn.

- A economia realizada deve aparecer no Dashboard em destaque
- O e-mail mensal de resultado deve trazer o acumulado desde o início
- A tela de configurações deve mostrar "você está no plano X, já economizou R$Y"

---

## Princípio 6 — Engine antes de IA

A lógica de negócio é determinística. A IA é comunicação.

Nunca use IA para substituir uma regra de negócio que pode ser explícita.

Correto: Engine identifica desperdício → IA explica em linguagem clara
Errado: IA decide se uma assinatura deve ser cancelada ou não

Benefícios desta separação:
- Auditável: você pode explicar por que gerou cada recomendação
- Confiável: não alucinações em decisões financeiras
- Barato: só chama Groq quando necessário, não para cada interação
- Testável: regras de negócio têm testes; respostas de LLM não

---

## Princípio 7 — Construa para o CFO, não para o TI

O tomador de decisão que assina o cheque é financeiro, não técnico.

- Use linguagem de negócio, não técnica (economia, desperdício, ROI — não API, webhook, integration)
- Priorize exportações e relatórios gerenciais
- Torne o produto defensável em uma reunião de diretoria
- O Dashboard precisa ser legível por alguém que nunca abriu o sistema antes

---

## Princípio 8 — Falhe silenciosamente, nunca corrompa dados

Se a IA não responder, mostre a recomendação sem explicação.
Se o email não for enviado, log o erro sem quebrar o fluxo.
Se uma integração falhar, mostre os dados locais.

O sistema de economia não pode parar por causa de uma dependência externa.

---

## Anti-princípios — O que evitar ativamente

- **Feature factory:** adicionar funcionalidades sem medir impacto na economia do cliente
- **Dashboard inflation:** criar mais gráficos porque "parece mais completo"
- **AI washing:** usar IA para parecer moderno, não para resolver um problema real
- **Premature optimization:** otimizar performance antes de ter usuários reais
- **Documentation paralysis:** documentar em excesso antes de validar com usuários
