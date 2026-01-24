# Documentação: Controle de Prazo e Qualidade (JAT)

Este documento descreve a arquitetura, a lógica do banco de dados e o funcionamento do sistema de controle de produção integrado ao Supabase e ao Datasul.

---

## 1. Arquitetura Geral

O sistema é composto por três camadas principais:
1.  **Backend (Datasul/Webhook)**: Envia dados de solicitações de material via webhooks.
2.  **Banco de Dados (Supabase/PostgreSQL)**: Armazena, processa e automatiza a lógica de prazos.
3.  **Frontend (Next.js)**: Interface em tempo real para operadores e gestores.

---

## 2. Estrutura do Banco de Dados (Supabase)

Utilizamos dois schemas principais para separar dados brutos de lógica de negócio:

### A. Schema `datasul`
Contém tabelas espelhadas/integradas do ERP Datasul.

#### Tabela `solicita-material-jat`
Recebe os dados "crus" do webhook do Datasul. Log de entrada para sincronização.

#### Tabela `item`
Cadastro mestre de itens.
- `it_codigo` (PK): Código do item.
- `desc_item`: Descrição completa.
- `fm_codigo`: Família do item (usado para identificar Fundidos/Alumínio na lógica de prazos).

#### Tabela `estrutura`
Árvore de produto (BOM - Bill of Materials).
- `es_codigo`: Item componente (filho).
- `it_codigo`: Item pai (montagem).
- Usada na recursividade para encontrar a prioridade de cálculo dos pais.

#### Tabela `prioridade-producao`
Define a ordem de produção.
- `it-codigo` (PK): Código do item pai.
- `nr-calculo`: Número da prioridade (quanto menor, mais urgente).

### B. Schema `app_controle_prazo_qualidade`
Onde reside a inteligência da aplicação.

#### Tabela `production_items`
Controla o fluxo de vida de cada item na produção.
-   **id**: UUID único.
-   **nr_solicitacao**: Número da solicitação Datasul.
-   **it_codigo**: Código do item.
-   **datasul_finished_at**: Quando o item saiu do Datasul (JAT).
-   **status**: Estado atual (`WASHING`, `ADHESIVE`, `FINISHED`).
-   **wash_deadline / adhesive_deadline**: Prazos calculados automaticamente.
-   **calculation_priority**: Armazena o "snapshot" da prioridade quando o item é finalizado.

#### Tabela `tv_settings`
Persiste as preferências do monitor por usuário.
-   **user_email**: Identificador do usuário.
-   **rotation_enabled**: Status da auto-rotação.
-   **rotation_interval**: Tempo em segundos entre trocas.
-   **selected_filters**: Lista de filtros para intercalar.

#### Tabela `warehouse_requests`
Gerencia pedidos extras de materiais.
-   **type**: Tipo do material (`HARDWARE` para Ferragem ou `PROFILE` para Perfil).
-   **status**: `PENDING` ou `COMPLETED`.
-   **completed_by**: Email do usuário que finalizou a solicitação.

#### Tabela `push_subscriptions` [NOVO]
Armazena as chaves de segurança (tokens) para envio de notificações Push.
-   **user_email**: Email vinculado ao dispositivo.
-   **subscription_json**: Dados técnicos da assinatura (Endpoint, Auth, P256dh).

#### Tabela `production_items_history` [NOVO]
Tabela de arquivamento para manter a tabela principal rápida. Armazena itens finalizados há mais de 30 dias.

### C. Schema `app_anotacoes` [NOVO]
Armazena dados do módulo de notas e quadros (Tldraw).

#### Tabela `notes`
Tabela principal que armazena os quadros.
- **id**: UUID único.
- **user_id**: Dono da nota. Protegido por RLS (só o dono acessa).
- **canvas_data** (JSONB): O estado completo do quadro Tldraw.
- **preview_image**: Miniatura para listagem.
- **is_favorite**: Flag para favoritos.
- **tags**: Array de tags para categorização.

#### Tabela `markers` [NOVO]
Armazena as Pessoas e Tópicos usados para taguear as notas.
- **name**: Nome exibido (Ex: "Carlos (Engenharia)").
- **type**: `PERSON` ou `TOPIC`.
- **avatar_url**: URL da imagem (Dicebear ou Upload).
- **metadata**: JSONB para dados extras (cargos, sub-itens).

#### Tabela `reminders` [NOVO]
Eventos e lembretes do calendário.
- **date**: Data e hora do evento.
- **title**: Título curto.
- **description**: Detalhes opcionais.
- **title**: Título curto.
- **description**: Detalhes opcionais.
- **is_completed**: Status de conclusão.

#### Tabela `chat_messages` [NOVO]
Armazena o histórico de conversas com o assistente Jarvis.
- **id**: UUID único.
- **user_id**: Dono da conversa (FK p/ `auth.users`).
- **role**: Quem enviou a mensagem (`user` ou `model`).
- **content**: Conteúdo textual da mensagem.
- **metadata**: Dados extras (opcional).
- **created_at**: Data e hora da mensagem (Indexado para performance).

---

## 3. Lógica de Automação (Triggers)

O sistema utiliza gatilhos inteligentes para gerenciar prazos dinâmicos:

### A. Sincronização e Cálculo de Prazo Inicial
Sempre que um registro entra no sistema (Datasul -> Monitoramento), o trigger `trg_sync_production_after_jat` realiza:
1.  **Validação de Classe**: O sistema consulta a tabela `datasul.estrutura` para identificar os componentes do item e a tabela `datasul.item` para verificar a família (`fm-codigo`).
2.  **Prazos Diferenciados**:
    -   **Fundidos e Alumínio** (`fm-codigo` entre 1000 e 1003): Prazo de **2 horas**.
    -   **Demais itens**: Prazo de **4 horas**.
3.  **Registro**: Insere o item em `production_items` com o `wash_deadline` calculado.

### B. Gestão de Etapa (Adesivagem)
O trigger `trg_calc_adhesive_deadline` atua na transição de etapas:
-   Assim que o status muda para `ADHESIVE` e o fim da lavagem é registrado, o sistema recalcula o novo prazo (`adhesive_deadline`) usando a mesma regra (2h ou 4h) a partir do momento atual.

### C. Snapshot de Prioridade e Auditoria
O trigger `trg_freeze_priority` preserva a história do item:
-   Ao mudar o status para `FINISHED`, o sistema executa a função recursiva de prioridade uma última vez e grava o resultado na coluna física `calculation_priority`.
-   Registra automaticamente o usuário logado (`wash_finished_by` / `adhesive_finished_by`).

### D. Arquivamento Automático [NOVO]
Função `archive_old_production_items` agendada via Cron:
-   Move registros com mais de 30 dias de finalizados para `production_items_history`.
-   Proteção contra Duplicados: As funções de sincronização (`sync_new_production_item`) verificam tanto a tabela ativa quanto o histórico antes de criar um novo item, garantindo que o que foi arquivado não seja re-importado.

---

## 4. Lógica do Frontend (Next.js)

### Fluxo de Estados (Kanban)
Os itens progridem através de ações de clique:
1.  **Lavagem**: O operador inicia a lavagem. Ao finalizar, o item "pula" para a fila de Adesivo e o **novo prazo é gerado automaticamente pelo banco**.
2.  **Adesivo**: Ao finalizar, o item é marcado como `FINISHED` e sai dos monitores ativos.

### Monitoramento de Urgência (Andon/TV)
-   O sistema compara o `deadline` (prazo dinâmico de 2h ou 4h) com a hora atual.
-   **Cálculo de Prioridade**: Utiliza uma função recursiva que sobe até 10 níveis na árvore de produto (BOM) buscando pais nas famílias `SA-017`, `SA-018`, `SA-024` ou `SA-028` para extrair o menor `nr-calculo`.
-   **Auto-Rotação**: Permite intercalar filtros (Lavagem, Adesivo, Almoxarifado) com tempo configurável e persistência por usuário.

### Dashboard de Gestão e PWA [NOVO]
-   **Métricas Diárias**: Soma de quantidades por setor, respeitando o turno das 06:00 AM.
-   **Progressive Web App (PWA)**: O sistema é instalável como um aplicativo no celular (Android/iOS).
-   **Web Push Notifications**: Permite o recebimento de alertas de atraso ("Cálculo 1") diretamente na tela de bloqueio do celular.
-   **Acesso via QR Code**: Botão no painel que gera um QR Code da URL atual para acesso instantâneo via câmera do celular.

---

## 5. Configuração de Acesso (Segurança)

Para que o app funcione, o Supabase precisa de:
1.  **Exposed Schemas**: O schema `app_controle_prazo_qualidade` deve estar na lista de schemas expostos na API.
2.  **Permissões (Grants)**: As roles `anon` e `authenticated` devem ter permissão de `USAGE` no schema e `ALL` nas tabelas.
3.  **RLS (Row Level Security)**: Políticas que garantem que apenas usuários autorizados alterem os dados.

---

**Desenvolvido para:** Gestão de Prazo e Qualidade Industrial.
