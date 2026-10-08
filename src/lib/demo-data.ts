// Dados de demonstração (usados pelo `npm run db:seed` e pela tela /setup)
import type { Prisma, PrismaClient } from "@prisma/client";

const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const DEMO_HLS_2 = "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8";

const hours = (h: number) => new Date(Date.now() + h * 3600_000);

export const DEMO_EMAILS = { agent: "ana@horus.com.br", tech: "carlos@horus.com.br", client: "cliente@horus.com.br" };

export async function seedDemo(
  prisma: PrismaClient,
  opts: {
    admin: { name: string; email: string; passwordHash: string };
    staffPasswordHash: string;
    clientPasswordHash: string;
  },
) {
  const admin = await prisma.user.create({ data: { ...opts.admin, email: opts.admin.email.toLowerCase(), role: "ADMIN" } });
  const agent = await prisma.user.create({ data: { name: "Ana Atendimento", email: "ana@horus.com.br", passwordHash: opts.staffPasswordHash, role: "AGENT" } });
  const tech = await prisma.user.create({ data: { name: "Carlos Técnico", email: "carlos@horus.com.br", passwordHash: opts.staffPasswordHash, role: "TECH", phone: "11977776666" } });

  const [basic, pro, condo] = await Promise.all([
    prisma.plan.create({ data: { name: "Residencial", description: "Ideal para casas e apartamentos", monthlyPrice: 89.9, cameraLimit: 4, retentionDays: 7, features: "Acesso pelo celular\nSuporte via WhatsApp" } }),
    prisma.plan.create({ data: { name: "Empresarial", description: "Comércios, escritórios e galpões", monthlyPrice: 249.9, cameraLimit: 16, retentionDays: 30, featured: true, features: "Monitoramento 24h\nAlertas de movimento\nManutenção preventiva" } }),
    prisma.plan.create({ data: { name: "Condomínio", description: "Portaria e áreas comuns", monthlyPrice: 589.0, cameraLimit: 32, retentionDays: 30, features: "Monitoramento 24h com central\nAcesso para síndico e moradores\nVisitas técnicas inclusas" } }),
  ]);

  const c1 = await prisma.customer.create({
    data: { name: "Condomínio Jardim das Flores", type: "PJ", document: "12.345.678/0001-90", email: "sindico@jardimflores.com.br", phone: "(11) 3333-4444", whatsapp: "5511988887777", address: "Rua das Flores, 100", city: "São Paulo", state: "SP" },
  });
  const c2 = await prisma.customer.create({
    data: { name: "Mercado Bom Preço", type: "PJ", document: "98.765.432/0001-10", email: "contato@bompreco.com.br", phone: "(11) 95555-1234", whatsapp: "5511955551234", address: "Av. Brasil, 2500", city: "Guarulhos", state: "SP" },
  });
  const c3 = await prisma.customer.create({
    data: { name: "Maria Oliveira", type: "PF", document: "123.456.789-00", email: "maria@email.com", phone: "(11) 94444-2222", whatsapp: "5511944442222", address: "Rua Ipê, 45", city: "Osasco", state: "SP" },
  });

  await prisma.user.create({ data: { name: "Síndico Roberto", email: "cliente@horus.com.br", passwordHash: opts.clientPasswordHash, role: "CLIENT", customerId: c1.id } });

  const k1 = await prisma.contract.create({ data: { customerId: c1.id, planId: condo.id, monthlyValue: 589, dueDay: 10 } });
  const k2 = await prisma.contract.create({ data: { customerId: c2.id, planId: pro.id, monthlyValue: 249.9, dueDay: 5 } });
  const k3 = await prisma.contract.create({ data: { customerId: c3.id, planId: basic.id, monthlyValue: 89.9, dueDay: 15 } });

  const now = new Date();
  const ref = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  for (const [k, cust, day] of [[k1, c1, 10], [k2, c2, 5], [k3, c3, 15]] as const) {
    await prisma.invoice.create({ data: { customerId: cust.id, contractId: k.id, reference: ref(-1), amount: k.monthlyValue, dueDate: new Date(now.getFullYear(), now.getMonth() - 1, day, 12), status: "PAID", paidAt: new Date(now.getFullYear(), now.getMonth() - 1, day - 1) } });
  }
  await prisma.invoice.create({ data: { customerId: c1.id, contractId: k1.id, reference: ref(0), amount: 589, dueDate: new Date(now.getFullYear(), now.getMonth(), 10, 12), status: "OPEN" } });
  await prisma.invoice.create({ data: { customerId: c2.id, contractId: k2.id, reference: ref(0), amount: 249.9, dueDate: new Date(now.getFullYear(), now.getMonth(), 5, 12), status: "OVERDUE" } });

  const cams = await Promise.all([
    prisma.camera.create({ data: { name: "Portaria principal", location: "Entrada", customerId: c1.id, streamUrl: DEMO_HLS, status: "ONLINE", brand: "Intelbras VIP 1230", lastSeenAt: now } }),
    prisma.camera.create({ data: { name: "Garagem", location: "Subsolo 1", customerId: c1.id, streamUrl: DEMO_HLS_2, status: "OFFLINE", brand: "Hikvision DS-2CD1023" } }),
    prisma.camera.create({ data: { name: "Playground", location: "Área comum", customerId: c1.id, streamUrl: DEMO_HLS, status: "ONLINE", lastSeenAt: now } }),
    prisma.camera.create({ data: { name: "Caixas", location: "Frente de loja", customerId: c2.id, streamUrl: DEMO_HLS_2, status: "ONLINE", lastSeenAt: now } }),
    prisma.camera.create({ data: { name: "Estoque", location: "Depósito", customerId: c2.id, streamUrl: DEMO_HLS, status: "MAINTENANCE" } }),
    prisma.camera.create({ data: { name: "Quintal", customerId: c3.id, streamUrl: DEMO_HLS, status: "ONLINE", lastSeenAt: now } }),
    prisma.camera.create({ data: { name: "Vista da Avenida Central", location: "Centro da cidade", description: "Câmera pública de demonstração da Horus", streamUrl: DEMO_HLS, isPublic: true } }),
    prisma.camera.create({ data: { name: "Praça da Matriz", location: "Centro histórico", description: "Acompanhe o movimento da praça ao vivo", streamUrl: DEMO_HLS_2, isPublic: true } }),
  ]);

  let n = 0;
  const ticket = async (data: Omit<Prisma.TicketUncheckedCreateInput, "number">) => prisma.ticket.create({ data: { ...data, number: ++n } });
  const t1 = await ticket({
    subject: "Câmera da garagem sem imagem", description: "A câmera da garagem está sem imagem desde ontem à noite.", category: "CAMERA_OFFLINE", priority: "HIGH",
    status: "IN_PROGRESS", channel: "WHATSAPP", customerId: c1.id, cameraId: cams[1].id, assigneeId: agent.id, contactName: "Roberto", contactPhone: "5511988887777", slaDueAt: hours(-2),
    aiSummary: "Câmera da garagem (subsolo) offline desde a noite anterior.",
    messages: { create: [
      { authorType: "CUSTOMER", body: "A câmera da garagem está sem imagem desde ontem à noite." },
      { authorType: "AI", body: "Entendi! Já registrei sua solicitação e nossa equipe técnica vai cuidar disso." },
      { authorType: "AGENT", authorId: agent.id, body: "Olá Roberto, verificamos remotamente e parece ser a fonte de alimentação. Vamos agendar uma visita técnica." },
    ] },
  });
  await ticket({
    subject: "Solicitação de gravação — 02/10 às 22h", description: "Preciso das imagens da caixa 2 do dia 02/10 por volta das 22h, houve um problema com um cliente.", category: "FOOTAGE_REQUEST", priority: "HIGH",
    status: "OPEN", channel: "PORTAL", customerId: c2.id, cameraId: cams[3].id, slaDueAt: hours(5),
    messages: { create: [{ authorType: "CUSTOMER", body: "Preciso das imagens da caixa 2 do dia 02/10 por volta das 22h, houve um problema com um cliente." }] },
  });
  await ticket({
    subject: "Dúvida sobre acesso pelo celular", description: "Como faço para ver as câmeras pelo celular?", category: "ACCESS", priority: "LOW",
    status: "RESOLVED", channel: "PORTAL", customerId: c3.id, slaDueAt: hours(40), resolvedAt: now, rating: 5,
    messages: { create: [
      { authorType: "CUSTOMER", body: "Como faço para ver as câmeras pelo celular?" },
      { authorType: "AGENT", authorId: agent.id, body: "Olá Maria! Basta acessar o portal do cliente pelo navegador do celular com seu e-mail e senha." },
    ] },
  });

  await prisma.serviceOrder.create({
    data: { type: "MAINTENANCE", customerId: c1.id, ticketId: t1.id, technicianId: tech.id, scheduledAt: hours(3), address: "Rua das Flores, 100 - São Paulo", notes: "Verificar fonte de alimentação da câmera da garagem." },
  });
  await prisma.serviceOrder.create({
    data: { type: "INSTALLATION", customerId: c2.id, technicianId: tech.id, scheduledAt: hours(48), address: "Av. Brasil, 2500 - Guarulhos", notes: "Instalar 2 câmeras adicionais no estacionamento." },
  });

  await prisma.lead.createMany({
    data: [
      { name: "João Pereira", company: "Padaria Pão Quente", phone: "(11) 91234-5678", source: "SITE", stage: "NEW", interest: "Comércio / loja", value: 249.9, ownerId: agent.id },
      { name: "Fernanda Costa", company: "Residencial Aurora", phone: "(11) 92345-6789", source: "INDICACAO", stage: "VISIT", interest: "Condomínio", value: 589, ownerId: admin.id },
      { name: "Paulo Mendes", phone: "(11) 93456-7890", source: "WHATSAPP", stage: "PROPOSAL", interest: "Residência", value: 89.9, ownerId: agent.id },
      { name: "Logística Rápida Ltda", company: "Logística Rápida", email: "compras@lograpida.com.br", source: "TELEFONE", stage: "NEGOTIATION", interest: "Empresa / indústria", value: 899, ownerId: admin.id },
    ],
  });

  await prisma.activity.createMany({
    data: [
      { customerId: c1.id, type: "SYSTEM", description: "Cliente cadastrado", userId: admin.id },
      { customerId: c1.id, type: "MEETING", description: "Reunião com o síndico para apresentar o relatório trimestral", userId: agent.id },
    ],
  });

  await prisma.banner.createMany({
    data: [
      { title: "O olho que protege o que importa para você", subtitle: "Videomonitoramento 24h para residências, condomínios e empresas, com suporte inteligente pelo WhatsApp.", ctaLabel: "Solicitar orçamento", ctaUrl: "/contato", placement: "HOME", order: 0 },
      { title: "Condomínio mais seguro", subtitle: "Plano completo com central de monitoramento e acesso para moradores.", ctaLabel: "Conhecer o plano", ctaUrl: "/planos", placement: "HOME", order: 1 },
      { title: "Indique e ganhe", subtitle: "Indique um amigo e ganhe 1 mês de mensalidade grátis.", ctaLabel: "Indicar agora", ctaUrl: "/contato", placement: "HOME", order: 2 },
      { title: "Novo: gravação em nuvem por 60 dias", subtitle: "Amplie o armazenamento das suas câmeras. Fale com o suporte.", ctaLabel: "Quero saber mais", ctaUrl: "/portal/chamados/novo", placement: "PORTAL", order: 0 },
    ],
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      { category: "Acesso", question: "Como acesso minhas câmeras pelo celular?", answer: "Acesse o site da Horus, clique em 'Área do cliente' e entre com seu e-mail e senha. A página funciona no navegador do celular." },
      { category: "Acesso", question: "Esqueci minha senha. O que faço?", answer: "Fale com o suporte pelo WhatsApp ou abra um chamado; um atendente redefine sua senha após confirmar seus dados." },
      { category: "Técnico", question: "Minha câmera está offline. O que posso verificar?", answer: "Verifique se há energia no local e se o roteador/internet está funcionando. Desligue e ligue o gravador (DVR/NVR) da tomada. Se não voltar em 10 minutos, abra um chamado." },
      { category: "Gravações", question: "Como solicito uma gravação?", answer: "Abra um chamado do tipo 'Solicitação de gravação' informando câmera, data e horário aproximado. As imagens ficam disponíveis conforme o período de retenção do seu plano." },
      { category: "Gravações", question: "Por quanto tempo as gravações ficam guardadas?", answer: "Depende do plano: Residencial 7 dias; Empresarial e Condomínio 30 dias." },
      { category: "Financeiro", question: "Como obtenho a 2ª via do boleto?", answer: "No portal do cliente, menu Financeiro, ou solicitando ao suporte pelo WhatsApp." },
      { category: "Atendimento", question: "Qual o horário de atendimento?", answer: "O assistente virtual atende 24h pelo WhatsApp. A equipe técnica atende de segunda a sábado, das 8h às 18h, e plantão 24h para emergências." },
    ],
  });

  // Conversa de exemplo no WhatsApp
  await prisma.whatsAppConversation.create({
    data: {
      phone: "5511988887777", contactName: "Roberto", customerId: c1.id, mode: "BOT",
      messages: { create: [
        { direction: "IN", sender: "CUSTOMER", body: "A câmera da garagem está sem imagem desde ontem à noite." },
        { direction: "OUT", sender: "AI", body: "Entendi! Já registrei sua solicitação e nossa equipe técnica vai cuidar disso.\n\n📋 Protocolo do chamado: *#00001*", status: "simulated" },
      ] },
    },
  });

}
