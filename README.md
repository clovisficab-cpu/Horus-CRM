# Horus — Sistema de Gestão (CRM + Suporte + Portal + Site)

Sistema da **Horus Videomonitoramento** com quatro áreas em uma única aplicação:

| Área | Rota | Quem acessa |
|---|---|---|
| Site institucional | `/`, `/planos`, `/cameras`, `/contato` | Público |
| Portal do cliente | `/portal` | Clientes (perfil `CLIENT`) |
| Painel de gestão (CRM + suporte) | `/admin` | Equipe (`ADMIN`, `AGENT`, `TECH`) |
| Integrações | `/api/whatsapp/webhook`, `/api/cameras/status` | WhatsApp Cloud API, servidor de mídia/NVR |

## Funcionalidades

### CRM
- **Clientes**: cadastro PF/PJ, linha do tempo de interações, câmeras, contratos, faturas, chamados, OS e criação de acesso ao portal.
- **Funil de vendas (leads)**: kanban por etapa (Novo → Contato → Visita técnica → Proposta → Negociação → Ganho/Perdido). Os leads chegam do formulário do site, do WhatsApp ou são cadastrados manualmente; conversão em cliente com um clique.
- **Financeiro**: planos, contratos, geração mensal de faturas, baixa, inadimplência e MRR.
- **Dashboard**: chamados ativos e SLA estourado, câmeras offline, MRR, inadimplência, funil, agenda técnica do dia, CSAT.

### Adaptações para videomonitoramento
- **Câmeras**: cadastro por cliente, status (online/offline/manutenção), stream HLS/MJPEG/iframe/snapshot, vitrine pública.
- **Ordens de serviço**: agenda técnica (instalação, manutenção, retirada, vistoria) vinculada a chamados, com relatório do técnico.
- **Monitoramento automático**: `POST /api/cameras/status` atualiza o status da câmera e **abre um chamado automaticamente** quando uma câmera de cliente fica offline.
- **Solicitação de gravação** direto da tela da câmera no portal.

### Central de atendimento (chamados + IA + WhatsApp)
- Chamados com protocolo, categoria, prioridade, **SLA por prioridade** (4h/8h/24h/72h), responsável, notas internas, avaliação do cliente (1–5).
- **Triagem com IA**: categoria, prioridade e resumo definidos automaticamente na abertura.
- **"✨ Sugerir com IA"**: rascunho de resposta para o atendente, usando o histórico e a base de conhecimento.
- **Bot de WhatsApp com IA**: identifica o cliente pelo número e consulta câmeras, chamados e faturas. Responde dúvidas pela base de conhecimento, **abre chamado** e devolve o protocolo, acrescenta informações a um chamado já aberto ou **transfere para um humano**.
- **Inbox de WhatsApp** no painel: o atendente assume a conversa ou a devolve ao bot. As respostas públicas em chamados abertos pelo WhatsApp também são enviadas ao WhatsApp do cliente.
- **Simulador** para testar o bot sem um número real.
- **Base de conhecimento** (FAQ) usada pela IA e exibida na central de ajuda do portal.

### Portal do cliente
Câmeras ao vivo, abertura e acompanhamento de chamados, financeiro (contrato e faturas), central de ajuda e banners de campanhas.

### Site institucional
Hero e campanhas gerenciáveis pelo painel (**Site e banners**), serviços, planos (vindos do cadastro), vitrine de câmeras públicas ao vivo, formulário de orçamento (gera um lead) e botão flutuante de WhatsApp.

## Tecnologia
- **Next.js 15** (App Router, Server Actions) + **TypeScript** + **Tailwind CSS 4**
- **Prisma** + **PostgreSQL**
- **Claude (Anthropic API)** para a IA, com fallback por regras quando não há chave
- **WhatsApp Cloud API** (Meta)
- **hls.js** para reprodução das câmeras

## Publicar na internet

Veja o passo a passo em **[DEPLOY.md](DEPLOY.md)**: Vercel + Neon (PostgreSQL), com plano gratuito. No primeiro acesso, a tela `/setup` cria o administrador.

## Rodar localmente

Requer Node.js 20+ e Docker (para o PostgreSQL).

```bash
npm install
cp .env.example .env        # ajuste as variáveis
docker compose up -d        # sobe o PostgreSQL local
npm run db:deploy           # cria as tabelas
npm run db:seed             # dados de demonstração (opcional)
npm run dev                 # http://localhost:3000
```

Acessos de demonstração criados pelo `db:seed`:
- Equipe: `admin@horus.com.br` / `horus123` (também `ana@` = atendente e `carlos@` = técnico)
- Cliente: `cliente@horus.com.br` / `cliente123`

Sem o seed, acesse `/login`: o sistema leva para `/setup`, onde você cria o primeiro administrador.

## Configuração

| Variável | Para quê |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL: conexão com pool (aplicação) e direta (migrações) |
| `AUTH_SECRET` | Segredo das sessões (**obrigatório em produção**) |
| `SETUP_TOKEN` | Código pedido na tela `/setup` para criar o primeiro administrador (**obrigatório em produção**) |
| `ANTHROPIC_API_KEY` | Ativa a IA (triagem, sugestões, bot). Sem ela o sistema usa regras de palavras-chave |
| `AI_MODEL` | Modelo do Claude (padrão `claude-opus-5-5`) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Envio de mensagens. Sem eles, fica em modo simulação |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do webhook |
| `WHATSAPP_APP_SECRET` | Valida a assinatura `X-Hub-Signature-256` dos webhooks (recomendado) |
| `CAMERA_WEBHOOK_TOKEN` | Protege o endpoint `/api/cameras/status` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número exibido no botão do site |

### WhatsApp (Meta)
1. Crie um app em developers.facebook.com com o produto **WhatsApp**.
2. Webhook: `https://SEU_DOMINIO/api/whatsapp/webhook`, com o mesmo `WHATSAPP_VERIFY_TOKEN`; assine o campo `messages`.
3. Preencha `WHATSAPP_TOKEN` (token permanente de usuário do sistema), `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_APP_SECRET`.

O bot responde dentro da janela de 24h de atendimento. Para mensagens ativas (por exemplo, avisar que uma câmera caiu) a Meta exige templates aprovados, o que fica como próximo passo.

### Câmeras
Navegadores não reproduzem RTSP. Use um servidor de mídia como **MediaMTX** ou **go2rtc** para converter os streams das câmeras/NVR em HLS (ou WebRTC) e cadastre a URL `.m3u8` na câmera. Em produção, prefira URLs com token/expiração, porque a URL do stream fica visível no navegador de quem assiste.

Status automático (por exemplo, um script ou hook do servidor de mídia):
```bash
curl -X POST https://SEU_DOMINIO/api/cameras/status \
  -H "x-api-key: $CAMERA_WEBHOOK_TOKEN" -H "Content-Type: application/json" \
  -d '{"cameraId":"<id exibido na tela da câmera>","status":"OFFLINE"}'
```

### Banco de dados
Alterações no `prisma/schema.prisma` viram migrações com `npm run db:migrate`. O `npm run build` aplica as migrações pendentes (`prisma migrate deploy`) antes de compilar.

## Estrutura
```
prisma/schema.prisma      modelo de dados
prisma/migrations         migrações do banco
prisma/seed.ts            dados de demonstração (CLI)
src/lib/demo-data.ts      dados de demonstração (usados pelo seed e pelo /setup)
src/lib/ai.ts             IA (triagem, sugestão de resposta, bot)
src/lib/bot.ts            fluxo do WhatsApp (contexto, ações, envio)
src/lib/whatsapp.ts       cliente da WhatsApp Cloud API
src/lib/tickets.ts        criação de chamados, protocolo e SLA
src/app/(site)            site institucional
src/app/portal            portal do cliente
src/app/admin             painel de gestão
src/app/api               webhooks
```

## Próximos passos sugeridos
- Templates de WhatsApp para notificações ativas (câmera offline, fatura vencendo, OS agendada)
- Emissão de boletos/PIX (Asaas, Gerencianet, Mercado Pago) e conciliação automática
- Recebimento de mídia no WhatsApp (fotos/áudio) e transcrição
- Redefinição de senha por e-mail
- App mobile do técnico (PWA) com check-in e fotos da OS
- Integração direta com NVRs (Intelbras/Hikvision) para status e gravações
