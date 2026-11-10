# Horus Videomonitoramento

Sistema de gestão da Horus: site institucional, portal do cliente e painel da equipe (CRM, câmeras, chamados com IA, WhatsApp com IA, ordens de serviço e financeiro).

Construído originalmente na Lovable e migrado para desenvolvimento direto. Tecnologias: TanStack Start, React, TypeScript, Tailwind CSS, Supabase (banco, login e segurança RLS) e Cloudflare Workers (hospedagem).

## Estrutura

- `src/routes/` — páginas (site público, `/auth`, `/admin/*`, `/portal/*`) e APIs (`/api/public/whatsapp/*`).
- `src/lib/` — regras de negócio, IA (`ai/`), WhatsApp (`whatsapp/`, com a "tomada" de provedor em `provider.server.ts`) e a Íris, atendente com IA do WhatsApp (`iris/`: regras fixas, prompt, ferramentas e fluxo de atendimento).
- `drizzle/migrations/` — histórico de migrações do banco.
- `supabase/horus-setup.sql` — script único para criar o banco num projeto Supabase novo.

## Configuração

### 1. Banco (Supabase)
No painel do Supabase: **SQL Editor → New query**, cole todo o `supabase/horus-setup.sql` e clique em **Run**.

### 2. Variáveis de ambiente
Públicas (usadas no build — podem ficar no repositório em `.env.production`):

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave *publishable* (ou *anon*) do Supabase |

Secretas (cadastrar na Cloudflare: Worker → Settings → Variables and Secrets — nunca no repositório):

| Variável | Para quê |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | chave publishable/anon |
| `SUPABASE_SERVICE_ROLE_KEY` | chave *secret/service_role* (operações administrativas no servidor) |
| `AI_API_KEY` | chave da IA (padrão: Google Gemini — aistudio.google.com). Para a Íris, use uma chave com **faturamento ativado**: o plano gratuito permite só ~20 pedidos/dia no modelo principal |
| `AI_BASE_URL`, `AI_MODEL`, `AI_MODEL_RESERVA` | opcionais, para trocar de provedor/modelo de IA (padrão: `gemini-3.5-flash`, reserva `gemini-flash-lite-latest`) |
| `CRON_SECRET` | protege `/api/public/whatsapp/processar` (agendador) |
| `WHATSAPP_PROVIDER`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | integração com o WhatsApp (sem elas, modo simulação) |

### 3. Publicação (Cloudflare)
Workers & Pages → **Create → Import a repository** → este repositório.
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

### 4. Primeiro acesso
Abra `/auth` e use **"Primeiro acesso? Criar conta de administrador"**. A opção some depois que existe um administrador.

## Desenvolvimento

```sh
npm install
npm run dev        # servidor local
npx tsc --noEmit   # verificação de tipos
npm test           # testes
npm run build      # build para Cloudflare
```
