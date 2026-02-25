# Configuração do Túnel Cloudflare para Acesso ao MariaDB

Para liberar o acesso externo ao seu banco MariaDB diretamente pelo seu VSCode usando o Cloudflare Tunnels (assim como você fez na rota 3 - `db.pcpsuporterei.site` para o Postgres), siga estes passos no painel que você enviou:

## Passo a Passo no Painel do Cloudflare

1. Clique no botão azul **"+ Adicionar uma rota de aplicativo publicada"** (ou "Add a public hostname" se estiver em inglês).
2. Na tela que abrir, preencha as informações:
   - **Domínio/Subdomínio:** Escolha um subdomínio claro para o MariaDB (ex: `mariadb.pcpsuporterei.site` ou `db-maria.pcpsuporterei.site`).
   - **Path (Caminho):** Deixe em branco.
3. Na seção de **Serviço (Service)**:
   - **Type (Tipo):** Selecione `TCP` (isso é crucial, banco de dados **não** é HTTP).
   - **URL:** Insira o host interno e a porta interna do seu MariaDB informados pelo Easypanel: `bancos_mariadb:3306` (Se isso não funcionar por resolução de DNS do Cloudflared, use o IP do container MariaDB ou `localhost:3307` dependendo de como o tunnel roda no host).
4. Salve a rota.

## Como configurar o `.env.local` depois de criar o Túnel

Depois que a rota TCP estiver publicada no Cloudflare, você vai precisar atualizar a variável no seu `c:\Projetos\saas\.env.local`:

```env
# Em vez de apontar para eayspanel.pcpsuporterei.site:3307
# Você apontará para o túnel do cloudflare.
MARIADB_APONTAMENTOS_URL="mysql://admin:suporterei@mariadb.pcpsuporterei.site:3306/apontamentos"
```

> [!WARNING]
> Regra do Cloudflare para rotas TCP: Para conectar do seu VSCode pelo túnel TCP do Cloudflare, você precisará ter o arquivo `cloudflared.exe` rodando na sua máquina local estabelecendo uma ponte (proxy), a menos que você tenha o WARP configurado.

## Alternativa mais simples (Para Desenvolvimento)

Se você não quiser lidar com a configuração reversa de TCP do Cloudflare na sua máquina de desenvolvimento local:

1. Abra diretamente a porta `3307` no painel da infraestrutura (VPS - Hetzner, AWS, etc) por onde o `eayspanel...:3307` transita.
2. Ou, a melhor opção: faça o commit desta tela, faça o deploy, e deixe ela acessar a rota interna local (`bancos_mariadb:3306`).
