# RecurringRadar 🎉

**SaaS Subscription Management Platform** — Gerenciar, analisar e otimizar gastos com assinaturas em nuvem.

## 🎯 Features

### 5 Telas Funcionais

- **◈ Dashboard** — Visão executiva com 4 cards de métricas, banner de alertas, top gastos e gráfico de uso
- **⊞ Assinaturas** — Tabela interativa com filtros, busca, ordenação, barra de progresso de uso e status colorido
- **◉ Alertas** — Central inteligente com 3 tipos de alertas automáticos (cancelar, risco, renovação)
- **▦ Relatórios** — Gráfico de barras por categoria, resumo financeiro, projeção anual
- **◎ Configurações** — Perfil do usuário, notificações, informações do plano

### Design System
- **Tema**: Dark mode com tipografia monospace (DM Mono)
- **Cores**: Índigo/Violeta primário + indicadores (Verde/Laranja/Vermelho)
- **Sidebar Recolhível**: Ganhe espaço sem perder navegação
- **Responsivo**: Grid fluido com padding adaptável

### Data Management
- 12 assinaturas mock realistas
- Estado local com React Hooks
- Ordenação (Preço, Uso)
- Filtros por categoria + busca
- Modal para adicionar novas assinaturas

## 🚀 Setup

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📁 Estrutura

```
recurring-radar/
├── src/
│   ├── App.tsx          # Componente principal
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Configuração Vite
├── tsconfig.json        # Configuração TypeScript
└── package.json         # Dependências
```

## 🛠️ Tech Stack

- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** — Build tool
- **CSS-in-JS** — Inline styles

## 📊 Mock Data

12 assinaturas com dados realistas:
- Slack, Figma, Notion, HubSpot, Zoom, Canva Pro
- GitHub, Asana, Hotjar, Intercom, Loom, Datadog

Cada assinatura possui:
- `name`, `category`, `price`, `currency`, `billing`
- `seats`, `lastUsed`, `status`, `usageScore`, `renewDate`

## 🎨 Customização

### Adicionar nova assinatura
Use o modal "+ Nova Assinatura" na tela de Assinaturas.

### Modificar cores
Edite as cores nos objetos `gradient`, `bg`, `color` nos componentes.

### Adicionar nova categoria
Atualize o array `CATEGORIES` em `src/App.tsx`.

## 📝 Notas

- Dados são persistidos apenas em sessão (localStorage não implementado)
- Modal utiliza `fixed` positioning com backdrop blur
- Tipografia carregada via Google Fonts API
- Scrollbar customizado com webkit

## 🔮 Próximos passos

- [ ] Integração com backend/API
- [ ] Persistência em localStorage/database
- [ ] Export de relatórios (PDF)
- [ ] Webhooks de renovação
- [ ] Temas customizáveis
- [ ] PWA offline support

---

**RecurringRadar** © 2026 · Desenvolvido com ❤️ em React
