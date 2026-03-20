### 2. Arquivo: `INSTRUCOES.md`

_(Focado no Humano/Equipe - Com correção para NPM e Design)_

````markdown
# 📘 Manual da Equipe (Starter Kit)

Este documento contém o passo a passo operacional para iniciar, configurar e fazer deploy de novos projetos usando este Starter Kit da **PCP Suporte Rei**.

---

## 🎨 Padrões de Design & UI

Este kit já vem com um sistema de design pré-configurado.

- **Login Padrão:** A página `/login` já está pronta e integrada.
- **Componentes:** Use os componentes da pasta `src/components/ui` (shadcn).
- **Cores:** As cores da marca estão definidas no `globals.css`.
- **Showcase:** Acesse a rota `/design` (em desenvolvimento) para ver os componentes disponíveis.

---

## 🚀 Como Iniciar um Novo Projeto (Passo a Passo)

### 1. Clonar a Estrutura

Copie os arquivos deste kit para a pasta do novo projeto, **EXCETO** as pastas e arquivos abaixo (que devem ser gerados do zero):

- ❌ `.git/`
- ❌ `node_modules/`
- ❌ `.next/`
- ❌ `package-lock.json` (opcional, mas recomendado gerar novo)

### 2. Instalar Dependências

Abra o terminal na pasta nova e rode (usamos NPM):

```bash
npm install
3. Configurar Variáveis LocaisCrie um arquivo .env.local na raiz (copie o conteúdo de .env.example) e preencha:Ini, TOMLNEXT_PUBLIC_API_URL="http://localhost:3000"

# Conexão Supabase (PCP Suporte Rei)
NEXT_PUBLIC_SUPABASE_URL="[https://eayspanel.pcpsuporterei.site](https://eayspanel.pcpsuporterei.site)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anonima"

# ⚠️ IMPORTANTE: Defina o Schema deste SaaS específico
# Ex: 'rh', 'estoque'. Use 'public' apenas se for genérico.
NEXT_PUBLIC_DB_SCHEMA="nome_do_schema_aqui"
🚢 Como Configurar o Deploy4. Ajustar GitHub ActionsAbra o arquivo .github/workflows/deploy.yml e altere a linha tags para o nome do novo projeto:YAMLtags: suportereipcp/nome-do-novo-saas:latest
5. Configurar Segredos (GitHub Repo)Vá em Settings > Secrets and variables > Actions e adicione:Nome do SecretO que colocarDOCKER_USERNAMESeu usuário Docker HubDOCKER_PASSWORDSua senha/token Docker HubEASYPANEL_WEBHOOK_URLURL do Webhook do serviço no EasypanelNEXT_PUBLIC_SUPABASE_URLURL do SupabaseNEXT_PUBLIC_SUPABASE_ANON_KEYChave AnônimaNEXT_PUBLIC_DB_SCHEMANome do schema (ex: estoque)6. Configurar EasypanelCrie um serviço do tipo App.Source: Selecione "Docker Image".Image: suportereipcp/nome-do-novo-saas:latest.Copie a URL do Webhook e salve no GitHub.Environment: Adicione a variável NEXT_PUBLIC_DB_SCHEMA com o valor do schema (ex: estoque).📂 Estrutura de Arquivos Importantessrc/lib/utils.ts: Contém a função cn (obrigatória para estilos).src/lib/supabase.ts: Cliente do banco de dados (Multi-tenancy).src/app/login/page.tsx: Tela de login padrão da empresa.
---

### ✅ Checklist Final
Como você já confirmou que o código está funcionando, basta salvar esses dois textos nos respectivos arquivos e fazer o **Commit** e **Push**.

Seu Starter Kit agora é uma ferramenta profissional completa: tem Login, Design System, Deploy Automático e Banco de Dados Multi-SaaS. Parabéns! 🚀

### COMANDOS GIT
git add .
git commit -m "mensagem"
git push origin main:rafael


git checkout main
git fetch origin
git reset --hard origin/main

taskkill /F /IM node.exe

```
````