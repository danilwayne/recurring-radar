# RecurringRadar - Copilot Instructions

## Project Overview
RecurringRadar é uma aplicação React completa para gerenciamento de assinaturas SaaS com 5 telas funcionais, design dark mode e componentes interativos.

## Development Guidelines

### Tech Stack
- React 18 com TypeScript
- Vite como build tool
- CSS-in-JS (inline styles)
- DM Mono para tipografia

### Code Style
- Componentes funcionais com React Hooks
- Type annotations completas
- Nomes descritivos em português
- Componentes reusáveis (StatCard, UsageBar, Sidebar)

### Arquitetura
- Página única (SPA) com navegação via state
- Mock data em MOCK_SUBSCRIPTIONS
- Helper functions no topo (fmt, totalMonthly, wasteCost, statusLabel, usageColor)

### Estrutura de Componentes
```
App (root)
├── Sidebar (nav + user)
├── Dashboard (overview + alerts)
├── Subscriptions (table + modal)
├── Alerts (smart alerts)
├── Reports (analytics)
└── Settings (preferences)
```

### Cores e Design Tokens
- **Background**: #08080f (dark), #111118 (cards)
- **Primário**: #6366f1 (índigo), #8b5cf6 (violeta)
- **Status**: #22c55e (ativo), #f59e0b (risco), #ef4444 (cancelar)
- **Text**: #f1f5f9 (primário), rgba(255,255,255,0.4) (secundário)

### Modificações Comuns

#### Adicionar novo filtro
1. Atualize `CATEGORIES` array
2. Passe no filtro da Subscriptions page
3. Atualize Reports se necessário

#### Adicionar status
1. Modifique `statusLabel()` function
2. Atualize alerts logic em `Alerts` component
3. Atualize estilos de background

#### Customizar layout
- Use `display: "grid"` ou `"flex"`
- Respeite padding padrão (32px outer, 20px inner)
- Mantenha border-radius 14px para cards

## Workflow

### Rodando localmente
```bash
npm install
npm run dev
# Abre em http://localhost:5173
```

### Building
```bash
npm run build
npm run preview
```

### Type checking
```bash
npm run type-check
```

## Conventions

- Variáveis locais: camelCase
- Componentes: PascalCase
- Constantes: UPPER_SNAKE_CASE
- Comentários com `// ─── SECTION ───`
- Estilos inline com objects typed as `any` quando necessário

## Notes for Future Development

- Estado é ephemeral (recarregar perde dados)
- Google Fonts carregada dinamicamente via `useEffect`
- Modal com `position: fixed` + `backdropFilter: blur`
- Tabela utiliza CSS Grid (não HTML table)
- Scrollbar customizada com `::-webkit-scrollbar`

## Testing Checklist

- [ ] Dashboard calcula corretamente totais e desperdício
- [ ] Assinaturas filtra por categoria e busca
- [ ] Modal adiciona nova assinatura
- [ ] Sidebar toggle recolhe/expande
- [ ] Alerts exibem corretamente por status/data
- [ ] Relatórios calculam projeções anuais
- [ ] Todos os links funcionam

---

Última atualização: Junho 2026
