# 🚀 Starter Kit Next.js 15 (Multi-tenancy + Docker + Easypanel)

Este é um template "Plug & Play" configurado para deploy automatizado via Docker Hub e Easypanel, otimizado para **Multi-tenancy** (Vários SaaS consumindo o mesmo Supabase com Schemas diferentes).

## 🛠 Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **UI/Design:** Tailwind CSS + shadcn/ui + Lucide React
- **Banco de Dados:** Supabase (Self-Hosted no Easypanel)
- **Arquitetura:** Multi-tenancy via Postgres Schemas
- **Deploy:** Docker (Standalone) + GitHub Actions + Easypanel

---

## 🤖 Diretrizes para IA (Architecture Guidelines)

**ATENÇÃO IA:** Ao gerar código para este projeto, siga estritamente estas regras:

### 1. Estratégia de Banco de Dados (Schemas)
Utilizamos uma única instância do Supabase para vários produtos internos.
- **Schema `public`:** Reservado EXCLUSIVAMENTE para dados compartilhados (Tabela `profiles`, `users`, `audit_logs`).
- **Schema do Projeto:** Todo SaaS deve ter seu próprio Schema isolado (ex: `rh`, `estoque`, `financeiro`).
- **Variável de Ambiente:** O nome do schema ativo é definido em `NEXT_PUBLIC_DB_SCHEMA`.

### 2. Conexão e Queries
- Utilize SEMPRE o cliente singleton em `src/lib/supabase.ts`.
- **Dados do SaaS:** Faça queries normais (`supabase.from('tabela')`). O cliente já está configurado para apontar para o schema correto.
- **Dados Compartilhados:** Para buscar dados globais, force o schema:
  ```typescript
  await supabase.schema('public').from('profiles').select('*');
3. Interface e Estilização
Componentes: Use sempre os componentes prontos em src/components/ui (Button, Input, Card). Não crie novos se já existirem.

Classes: Use Tailwind CSS e a função utilitária cn() para condicionais.

Ícones: Utilize a biblioteca lucide-react.