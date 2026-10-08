# Publicar o sistema Horus na internet

Guia passo a passo para colocar o sistema no ar com **Vercel** (hospedagem) e **Neon** (banco PostgreSQL). Os dois têm plano gratuito, e você entra com a sua conta do GitHub. Tempo estimado: 10 a 15 minutos.

Ao final você terá um endereço como `https://horus-crm.vercel.app`.

---

## 1. Criar o banco de dados (Neon)

1. Acesse **https://neon.tech** e clique em **Sign up**, depois em **Continue with GitHub**.
2. Crie um projeto:
   - **Project name:** `horus`
   - **Region:** **AWS South America East 1 (São Paulo)**
   - Clique em **Create project**.
3. No painel do projeto, clique em **Connect**. Vai aparecer a "connection string", que é o endereço de conexão do banco.
4. Copie **duas** versões dela e guarde num bloco de notas:
   - Com a opção **Connection pooling ligada** (o endereço tem `-pooler`): essa é a **`DATABASE_URL`**.
   - Com a opção **Connection pooling desligada**: essa é a **`DIRECT_URL`**.

Cada uma tem o formato `postgresql://usuario:senha@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`.

**Importante:** no final da `DATABASE_URL` (a que tem `-pooler`), acrescente `&pgbouncer=true`. Ela fica terminando em `?sslmode=require&pgbouncer=true`. A `DIRECT_URL` fica como está.

> Também funciona com o **Supabase** (Project Settings → Database). Lá, a `DATABASE_URL` é a "Transaction pooler" (porta 6543) com `?pgbouncer=true` no final, e a `DIRECT_URL` é a "Session pooler" ou a conexão direta (porta 5432).

## 2. Gerar dois segredos

Você precisa de dois textos aleatórios:

- **`AUTH_SECRET`**: protege as sessões de login. Gere um em https://generate-secret.vercel.app/32 ou digite qualquer texto aleatório com 32 caracteres ou mais.
- **`SETUP_TOKEN`**: um código que só você conhece, por exemplo `horus-instalacao-8472`. Ele é pedido uma única vez, na criação do primeiro administrador.

## 3. Publicar na Vercel

1. Acesse **https://vercel.com/signup** e clique em **Continue with GitHub**.
2. Clique em **Add New… → Project**.
3. Na lista de repositórios, encontre **Horus-CRM** e clique em **Import**. Se ele não aparecer, clique em **Adjust GitHub App Permissions** e libere o acesso ao repositório.
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | connection string **com** pooling (passo 1) |
   | `DIRECT_URL` | connection string **sem** pooling (passo 1) |
   | `AUTH_SECRET` | segredo gerado no passo 2 |
   | `SETUP_TOKEN` | código escolhido no passo 2 |

   Dica: dá para colar várias de uma vez no formato `NOME=valor`, uma por linha.

5. Clique em **Deploy** e aguarde de 2 a 4 minutos. A própria publicação cria as tabelas no banco.
6. Quando aparecer **Congratulations**, clique em **Continue to Dashboard**. O endereço do sistema aparece em **Domains**, por exemplo `horus-crm.vercel.app`.

## 4. Primeiro acesso

1. Abra `https://SEU-ENDERECO.vercel.app/login`. Na primeira vez, o sistema leva você para a tela **Configuração inicial**.
2. Preencha:
   - **Código de instalação:** o `SETUP_TOKEN`.
   - Seu nome, e-mail e senha de administrador.
   - Marque **Carregar dados de demonstração** se quiser ver o sistema preenchido com exemplos.
3. Clique em **Criar administrador e entrar**.

Depois disso a tela de configuração fica desativada para sempre.

Endereços do sistema:

| Área | Endereço |
|---|---|
| Site institucional | `https://SEU-ENDERECO.vercel.app` |
| Login (equipe e clientes) | `https://SEU-ENDERECO.vercel.app/login` |
| Painel da equipe | `https://SEU-ENDERECO.vercel.app/admin` |
| Portal do cliente | `https://SEU-ENDERECO.vercel.app/portal` |

## 5. Ativar a IA e o WhatsApp (opcional, pode ser depois)

Na Vercel: **Project → Settings → Environment Variables**. Adicione as variáveis abaixo e depois vá em **Deployments → ⋯ → Redeploy** para elas valerem.

| Recurso | Variáveis |
|---|---|
| IA (Claude) | `ANTHROPIC_API_KEY`. Crie a chave em https://console.anthropic.com |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (veja o README) |
| Botão de WhatsApp no site | `NEXT_PUBLIC_WHATSAPP_NUMBER`, por exemplo `5511999998888` |
| Status automático das câmeras | `CAMERA_WEBHOOK_TOKEN` |

No painel da Meta, o webhook do WhatsApp é `https://SEU-ENDERECO.vercel.app/api/whatsapp/webhook`.

## 6. Domínio próprio (opcional)

Na Vercel: **Project → Settings → Domains → Add**. Digite, por exemplo, `sistema.horus.com.br` e siga as instruções de DNS. Normalmente é um registro **CNAME** apontando para `cname.vercel-dns.com`, configurado onde o domínio foi registrado (Registro.br, GoDaddy etc.).

---

### Atualizações

Cada novo envio (push) para o branch de produção do GitHub publica a nova versão automaticamente. As alterações de banco (migrações) são aplicadas na própria publicação.

### Problemas comuns

- **Erro de build com "P1001 Can't reach database"**: confira `DATABASE_URL` e `DIRECT_URL`. Elas precisam terminar com `?sslmode=require` no Neon.
- **A tela de configuração pede SETUP_TOKEN**: a variável não foi cadastrada, ou foi cadastrada depois do deploy. Adicione e faça **Redeploy**.
- **Erro "AUTH_SECRET não configurado"**: adicione a variável e faça **Redeploy**.
