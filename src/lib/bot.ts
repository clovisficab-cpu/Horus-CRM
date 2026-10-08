import "server-only";
import { prisma } from "./db";
import { botRespond, type BotContext } from "./ai";
import { sendWhatsAppText } from "./whatsapp";
import { createTicket } from "./tickets";
import { date, normalizePhone, ticketCode } from "./format";

/** Localiza o cliente pelo número de WhatsApp/telefone (compara os últimos 8 dígitos) */
async function findCustomerByPhone(phone: string) {
  const tail = phone.slice(-8);
  const candidates = await prisma.customer.findMany({
    where: { OR: [{ whatsapp: { contains: tail } }, { phone: { contains: tail } }] },
  });
  return (
    candidates.find((c) => normalizePhone(c.whatsapp) === phone || normalizePhone(c.phone) === phone) ??
    candidates[0] ??
    null
  );
}

/** Envia mensagem de saída e registra na conversa */
export async function sendConversationMessage(conversationId: string, phone: string, body: string, sender: "AI" | "AGENT" | "SYSTEM") {
  const result = await sendWhatsAppText(phone, body);
  await prisma.whatsAppMessage.create({
    data: { conversationId, direction: "OUT", sender, body, waMessageId: result.id, status: result.status },
  });
  await prisma.whatsAppConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
  return result;
}

/**
 * Processa uma mensagem recebida no WhatsApp:
 * registra, identifica o cliente e, se a conversa estiver com o bot, deixa a IA
 * responder / abrir chamado / transferir para um humano.
 */
export async function handleIncomingMessage(input: { phone: string; text: string; contactName?: string; waMessageId?: string }) {
  const phone = normalizePhone(input.phone);

  if (input.waMessageId) {
    const dup = await prisma.whatsAppMessage.findUnique({ where: { waMessageId: input.waMessageId } });
    if (dup) return { duplicate: true };
  }

  let conversation = await prisma.whatsAppConversation.findUnique({ where: { phone } });
  if (!conversation) {
    const customer = await findCustomerByPhone(phone);
    conversation = await prisma.whatsAppConversation.create({
      data: { phone, contactName: input.contactName, customerId: customer?.id },
    });
  }

  await prisma.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "IN",
      sender: "CUSTOMER",
      body: input.text,
      waMessageId: input.waMessageId,
    },
  });
  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      contactName: input.contactName ?? conversation.contactName,
      unread: conversation.mode === "HUMAN" ? { increment: 1 } : undefined,
    },
  });

  if (conversation.mode === "HUMAN") return { mode: "HUMAN" };

  // Monta o contexto para a IA
  const [customer, history, knowledge] = await Promise.all([
    conversation.customerId
      ? prisma.customer.findUnique({
          where: { id: conversation.customerId },
          include: {
            cameras: { select: { name: true, status: true, location: true } },
            tickets: {
              where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } },
              select: { number: true, subject: true, status: true },
            },
            invoices: { where: { status: { in: ["OPEN", "OVERDUE"] } }, orderBy: { dueDate: "asc" } },
          },
        })
      : null,
    prisma.whatsAppMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.knowledgeArticle.findMany({ where: { published: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const ctx: BotContext = {
    contactName: input.contactName ?? conversation.contactName,
    customer: customer && {
      name: customer.name,
      status: customer.status,
      cameras: customer.cameras,
      openTickets: customer.tickets,
      openInvoices: customer.invoices.map((i) => ({
        reference: i.reference,
        amount: i.amount,
        dueDate: date(i.dueDate),
        status: i.status,
      })),
    },
    knowledge: knowledge.map((k) => ({ question: k.question, answer: k.answer })),
    history: history.reverse().map((m) => ({ from: m.direction === "IN" ? "CLIENTE" : "HORUS", body: m.body })),
  };

  const decision = await botRespond(ctx);
  let reply = decision.reply;

  if (decision.action === "open_ticket") {
    const transcript = ctx.history.map((m) => `${m.from}: ${m.body}`).join("\n");
    const ticket = await createTicket({
      subject: decision.ticket_subject || "Solicitação via WhatsApp",
      description: decision.ticket_description || input.text,
      category: decision.category,
      priority: decision.priority,
      customerId: conversation.customerId,
      channel: "WHATSAPP",
      contactName: ctx.contactName,
      contactPhone: phone,
      authorType: "AI",
      autoTriage: false,
    });
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorType: "SYSTEM", internal: true, body: `Transcrição do WhatsApp:\n${transcript}` },
    });
    reply = `${reply}\n\n📋 Protocolo do chamado: *${ticketCode(ticket.number)}*`;
  } else if (decision.action === "add_to_ticket" && decision.ticket_number) {
    const ticket = await prisma.ticket.findUnique({ where: { number: decision.ticket_number } });
    if (ticket && ticket.customerId === conversation.customerId) {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, authorType: "CUSTOMER", body: `[WhatsApp] ${input.text}` },
      });
      if (ticket.status === "WAITING_CUSTOMER") {
        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS" } });
      }
    }
  } else if (decision.action === "handoff") {
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { mode: "HUMAN", unread: { increment: 1 } },
    });
  }

  if (reply) await sendConversationMessage(conversation.id, phone, reply, "AI");
  return { mode: "BOT", action: decision.action, reply };
}
