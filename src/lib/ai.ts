import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "./constants";

// Integração com o Claude (Anthropic). Sem ANTHROPIC_API_KEY, todas as funções
// caem em regras simples de palavras-chave para o sistema continuar funcional.

const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
const CATEGORY_KEYS = Object.keys(TICKET_CATEGORIES);
const PRIORITY_KEYS = Object.keys(TICKET_PRIORITIES);

let client: Anthropic | null = null;
export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const COMPANY_CONTEXT = `A Horus é uma empresa brasileira de videomonitoramento: instala e mantém câmeras de segurança
(residências, condomínios e empresas), oferece monitoramento remoto, gravação em nuvem e acesso às câmeras
pelo portal do cliente. Responda sempre em português do Brasil.`;

/**
 * Chamada ao Claude com saída JSON validada por schema.
 * Usa fallback automático do servidor caso o modelo recuse a solicitação.
 */
async function callJson<T>(opts: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T | null> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: opts.messages,
  });

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    console.warn("[ai] resposta não utilizável:", response.stop_reason);
    return null;
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    return JSON.parse(text.text) as T;
  } catch {
    console.warn("[ai] JSON inválido na resposta");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Triagem de chamados
// ---------------------------------------------------------------------------

export type Triage = { category: string; priority: string; summary: string };

const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: CATEGORY_KEYS },
    priority: { type: "string", enum: PRIORITY_KEYS },
    summary: { type: "string", description: "Resumo objetivo do problema em até 2 frases" },
  },
  required: ["category", "priority", "summary"],
  additionalProperties: false,
};

export async function triageTicket(subject: string, description: string): Promise<Triage> {
  if (aiEnabled()) {
    try {
      const result = await callJson<Triage>({
        system: `${COMPANY_CONTEXT}

Você faz a triagem de chamados de suporte. Classifique a categoria e a prioridade.
Categorias: ${Object.entries(TICKET_CATEGORIES).map(([k, v]) => `${k} (${v})`).join(", ")}.
Prioridade: URGENT quando houver risco à segurança agora (todas as câmeras fora, invasão, incidente em andamento);
HIGH para câmera offline ou gravação necessária para ocorrência policial; MEDIUM para problemas parciais;
LOW para dúvidas, solicitações comerciais e financeiras sem urgência.`,
        messages: [{ role: "user", content: `Assunto: ${subject}\n\nDescrição:\n${description}` }],
        schema: TRIAGE_SCHEMA,
        maxTokens: 1500,
      });
      if (result) return result;
    } catch (e) {
      console.error("[ai] falha na triagem", e);
    }
  }
  return ruleTriage(`${subject} ${description}`);
}

function ruleTriage(text: string): Triage {
  const t = text.toLowerCase();
  let category = "OTHER";
  let priority = "MEDIUM";
  if (/offline|sem imagem|caiu|fora do ar|não aparece|nao aparece|tela preta|sem sinal/.test(t)) {
    category = "CAMERA_OFFLINE";
    priority = "HIGH";
  } else if (/grava[çc][ãa]o|v[íi]deo do dia|imagens do dia|backup|ocorr[êe]ncia|b\.?o\.?/.test(t)) {
    category = "FOOTAGE_REQUEST";
    priority = "HIGH";
  } else if (/boleto|fatura|pagamento|cobran[çc]a|nota fiscal|financeiro/.test(t)) {
    category = "BILLING";
    priority = "LOW";
  } else if (/senha|acesso|login|aplicativo|app/.test(t)) {
    category = "ACCESS";
  } else if (/emba[çc]ad|borr|qualidade|noturn|infravermelho|foco/.test(t)) {
    category = "IMAGE_QUALITY";
  } else if (/instala|nova c[âa]mera|ampliar|or[çc]amento/.test(t)) {
    category = "INSTALLATION";
    priority = "LOW";
  } else if (/manuten|cabo|fonte|dvr|nvr|hd /.test(t)) {
    category = "MAINTENANCE";
  }
  if (/invas|roubo|furto|assalto|urgente|emerg/.test(t)) priority = "URGENT";
  return { category, priority, summary: text.slice(0, 200) };
}

// ---------------------------------------------------------------------------
// Sugestão de resposta para o atendente
// ---------------------------------------------------------------------------

export async function suggestReply(input: {
  subject: string;
  category: string;
  customerName?: string | null;
  history: { author: string; body: string }[];
  knowledge: { question: string; answer: string }[];
}): Promise<string> {
  if (!aiEnabled()) {
    return `Olá${input.customerName ? `, ${input.customerName}` : ""}! Recebemos sua solicitação sobre "${input.subject}" e nossa equipe técnica já está analisando. Retornaremos com uma atualização em breve.`;
  }
  const result = await callJson<{ reply: string }>({
    system: `${COMPANY_CONTEXT}

Você ajuda atendentes do suporte a redigir respostas aos clientes. Escreva uma resposta cordial, clara e objetiva,
pronta para envio, sem prometer prazos que não estejam na conversa. Use a base de conhecimento quando aplicável.

Base de conhecimento:
${input.knowledge.map((k) => `- P: ${k.question}\n  R: ${k.answer}`).join("\n")}`,
    messages: [
      {
        role: "user",
        content: `Chamado: ${input.subject} (categoria: ${input.category})
Cliente: ${input.customerName ?? "não identificado"}

Histórico:
${input.history.map((m) => `[${m.author}] ${m.body}`).join("\n")}

Redija a próxima resposta do atendente.`,
      },
    ],
    schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
      additionalProperties: false,
    },
  });
  return result?.reply ?? "";
}

// ---------------------------------------------------------------------------
// Bot de atendimento (WhatsApp)
// ---------------------------------------------------------------------------

export type BotContext = {
  contactName?: string | null;
  customer?: {
    name: string;
    status: string;
    cameras: { name: string; status: string; location?: string | null }[];
    openTickets: { number: number; subject: string; status: string }[];
    openInvoices: { reference: string; amount: number; dueDate: string; status: string }[];
  } | null;
  knowledge: { question: string; answer: string }[];
  history: { from: "CLIENTE" | "HORUS"; body: string }[];
};

export type BotDecision = {
  reply: string;
  action: "none" | "open_ticket" | "add_to_ticket" | "handoff";
  ticket_number: number;
  ticket_subject: string;
  ticket_description: string;
  category: string;
  priority: string;
};

const BOT_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Mensagem a enviar ao cliente pelo WhatsApp" },
    action: { type: "string", enum: ["none", "open_ticket", "add_to_ticket", "handoff"] },
    ticket_number: { type: "integer", description: "Número do chamado existente (add_to_ticket) ou 0" },
    ticket_subject: { type: "string", description: "Assunto do novo chamado (open_ticket) ou vazio" },
    ticket_description: { type: "string", description: "Descrição completa do problema (open_ticket) ou vazio" },
    category: { type: "string", enum: CATEGORY_KEYS },
    priority: { type: "string", enum: PRIORITY_KEYS },
  },
  required: ["reply", "action", "ticket_number", "ticket_subject", "ticket_description", "category", "priority"],
  additionalProperties: false,
};

export async function botRespond(ctx: BotContext): Promise<BotDecision> {
  const lastMessage = ctx.history.filter((m) => m.from === "CLIENTE").at(-1)?.body ?? "";
  if (aiEnabled()) {
    try {
      const result = await callJson<BotDecision>({
        system: `${COMPANY_CONTEXT}

Você é a assistente virtual "Hórus" que atende clientes pelo WhatsApp. Seja cordial, breve (mensagens curtas,
adequadas ao WhatsApp) e resolutiva.

Como decidir a ação:
- "none": dúvidas que você responde com a base de conhecimento ou dados do cliente, ou quando ainda faltam
  informações para abrir o chamado (pergunte o que falta: qual câmera/local, desde quando, o que aparece).
- "open_ticket": quando houver um problema técnico, pedido de gravação, visita ou solicitação que exija a equipe.
  Preencha assunto, descrição completa (inclua tudo que o cliente informou), categoria e prioridade.
  Não abra chamado duplicado se já houver um aberto sobre o mesmo assunto; use "add_to_ticket".
- "add_to_ticket": o cliente traz novidades sobre um chamado já aberto (informe ticket_number).
- "handoff": o cliente pede para falar com um atendente humano, está irritado, ou o assunto é sensível
  (cancelamento, negociação de valores, reclamação grave). Avise que um atendente vai continuar.
Nunca invente informações (valores, prazos, status) que não estejam no contexto. Não informe senhas.
Se o contato não for cliente, apresente os serviços da Horus e ofereça um orçamento (action "handoff" se ele quiser).
Quando a ação não usar um campo, envie string vazia / 0 e category "OTHER", priority "MEDIUM".

Base de conhecimento:
${ctx.knowledge.map((k) => `- P: ${k.question}\n  R: ${k.answer}`).join("\n")}`,
        messages: [
          {
            role: "user",
            content: `Contexto do contato (dados do sistema):
${JSON.stringify({ nome_whatsapp: ctx.contactName, cliente: ctx.customer ?? "não identificado (não é cliente cadastrado)" }, null, 2)}

Conversa até agora:
${ctx.history.map((m) => `${m.from}: ${m.body}`).join("\n")}

Decida a próxima resposta para a última mensagem do CLIENTE.`,
          },
        ],
        schema: BOT_SCHEMA,
      });
      if (result) return result;
    } catch (e) {
      console.error("[ai] falha no bot", e);
    }
  }
  return ruleBot(ctx, lastMessage);
}

function ruleBot(ctx: BotContext, text: string): BotDecision {
  const t = text.toLowerCase();
  const name = ctx.customer?.name ?? ctx.contactName ?? "";
  const base: BotDecision = {
    reply: "",
    action: "none",
    ticket_number: 0,
    ticket_subject: "",
    ticket_description: "",
    category: "OTHER",
    priority: "MEDIUM",
  };

  if (/atendente|humano|pessoa|falar com algu[ée]m|cancel/.test(t)) {
    return { ...base, action: "handoff", reply: "Certo! Vou transferir você para um de nossos atendentes. Aguarde um momento, por favor. 👨‍💼" };
  }
  if (/boleto|fatura|pagamento|segunda via|2a via/.test(t)) {
    const inv = ctx.customer?.openInvoices ?? [];
    return {
      ...base,
      reply: inv.length
        ? `Encontrei ${inv.length} fatura(s) em aberto:\n${inv.map((i) => `• ${i.reference}: R$ ${i.amount.toFixed(2)} — venc. ${i.dueDate}`).join("\n")}\nVocê pode acessar a 2ª via pelo portal do cliente.`
        : "Não encontrei faturas em aberto no seu cadastro. Se precisar de algo mais, é só falar!",
    };
  }
  const triage = ruleTriage(text);
  if (triage.category !== "OTHER" && text.length > 15) {
    return {
      ...base,
      action: "open_ticket",
      reply: "Entendi! Já registrei sua solicitação e nossa equipe técnica vai cuidar disso.",
      ticket_subject: `${TICKET_CATEGORIES[triage.category as keyof typeof TICKET_CATEGORIES]} (WhatsApp)`,
      ticket_description: text,
      category: triage.category,
      priority: triage.priority,
    };
  }
  return {
    ...base,
    reply: `Olá${name ? `, ${name}` : ""}! 👋 Sou a assistente virtual da Horus Videomonitoramento.
Como posso ajudar?
1️⃣ Câmera offline ou com problema
2️⃣ Solicitar gravação/imagens
3️⃣ Financeiro (boletos)
4️⃣ Falar com um atendente
Descreva sua necessidade que eu já encaminho.`,
  };
}
