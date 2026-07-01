# RecurringRadar — Product Principles

These principles govern every design and engineering decision. When in doubt, return here.

---

## 1. The product sells decisions, not dashboards.

The user does not open RecurringRadar to look at charts. They open it to find out what to do. Every screen must answer one of three questions:

- **What should I do right now?** → Radar
- **What did I already do?** → Impacto
- **What am I paying for?** → Assinaturas

If a screen cannot answer one of these questions directly, it should not exist as a primary navigation destination.

---

## 2. One priority at a time.

The Radar surfaces a single dominant recommendation. The user resolves it or snoozes it. Then the next one surfaces. We do not overwhelm the user with six simultaneous opportunities — we lead them to the highest-value action available today.

Secondary recommendations exist as context ("Depois disso"), not as competing priorities.

---

## 3. Prove every dollar recovered.

The Impacto screen is not a report. It is a permanent record of decisions that generated real value. Every confirmed economy is timestamped, attributed, and stored immutably. The product must always be able to answer: "What has RecurringRadar done for you?"

---

## 4. Trust through honesty.

The product never fabricates data, activity, or intelligence. Status lines reflect real counts ("7 assinaturas monitoradas"). Timestamps reflect real events. If the system estimates something (usage_score entered manually), it does not present that estimate as measurement.

When integrations eventually replace manual estimates with real data, that will be flagged as an upgrade in data quality — not hidden.

---

## 5. Spending analysis is context, not destination.

Financial charts (gasto por categoria, top gastos, uso) exist to support the Recommendation Engine's reasoning. Users do not need to see the reasoning — they need the conclusion. Spending analysis lives in Impacto as contextual background, always below the ROI proof.

---

## 6. The product identity: an assistant, not a manager.

RecurringRadar is not "subscription management software." It is a financial decision assistant for founders and operators. The job to be done is not "maintain visibility over subscriptions" — it is "recover cash from software you are not using."

This distinction shapes everything: copy, priority hierarchy, empty states, and the post-confirmation experience.

---

## 7. Language communicates value, not mechanics.

Button labels describe outcomes, not actions:
- "Recuperar R$349/mês" — not "Confirmar cancelamento"
- "Dinheiro recuperável" — not "Economia potencial"
- "Já recuperado" — not "Economizados"
- "Decisões pendentes" — not "Oportunidades abertas"

Every word in the UI is a bet on what the user cares about. We bet on value, not process.
