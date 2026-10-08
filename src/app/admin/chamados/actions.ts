"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { createTicket, slaDueAt } from "@/lib/tickets";
import { suggestReply } from "@/lib/ai";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUS, label } from "@/lib/constants";
import { ticketCode } from "@/lib/format";

export async function createTicketAction(formData: FormData) {
  const user = await requireStaff();
  const ticket = await createTicket({
    subject: String(formData.get("subject") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    customerId: String(formData.get("customerId") ?? "") || null,
    cameraId: String(formData.get("cameraId") ?? "") || null,
    channel: String(formData.get("channel") ?? "PHONE"),
    category: String(formData.get("category") ?? "") || null,
    priority: String(formData.get("priority") ?? "") || null,
    contactName: String(formData.get("contactName") ?? "") || null,
    contactPhone: String(formData.get("contactPhone") ?? "") || null,
    authorType: "AGENT",
    authorId: user.id,
  });
  const assigneeId = String(formData.get("assigneeId") ?? "");
  if (assigneeId) await prisma.ticket.update({ where: { id: ticket.id }, data: { assigneeId } });
  redirect(`/admin/chamados/${ticket.id}`);
}

export async function replyAction(formData: FormData) {
  const user = await requireStaff();
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") ?? "").trim();
  const internal = formData.get("internal") === "on";
  const newStatus = String(formData.get("status") ?? "");
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

  if (body) {
    await prisma.ticketMessage.create({ data: { ticketId, authorType: "AGENT", authorId: user.id, body, internal } });
    // chamado aberto pelo WhatsApp: a resposta pública também vai para o WhatsApp do cliente
    if (!internal && ticket.channel === "WHATSAPP" && ticket.contactPhone) {
      const text = `*Horus — chamado ${ticketCode(ticket.number)}*\n${body}`;
      const result = await sendWhatsAppText(ticket.contactPhone, text);
      const conv = await prisma.whatsAppConversation.findUnique({ where: { phone: ticket.contactPhone } });
      if (conv) {
        await prisma.whatsAppMessage.create({
          data: { conversationId: conv.id, direction: "OUT", sender: "AGENT", body: text, waMessageId: result.id, status: result.status },
        });
      }
    }
  }

  const data: Record<string, unknown> = {};
  if (newStatus && newStatus !== ticket.status) {
    data.status = newStatus;
    data.resolvedAt = ["RESOLVED", "CLOSED"].includes(newStatus) ? new Date() : null;
    await prisma.ticketMessage.create({
      data: { ticketId, authorType: "SYSTEM", internal: true, body: `${user.name} alterou o status para "${label(TICKET_STATUS, newStatus)}"` },
    });
  } else if (body && !internal && ticket.status === "OPEN") {
    data.status = "IN_PROGRESS";
  }
  if (!ticket.assigneeId && !internal && body) data.assigneeId = user.id;
  if (Object.keys(data).length) await prisma.ticket.update({ where: { id: ticketId }, data });

  revalidatePath(`/admin/chamados/${ticketId}`);
}

export async function updateTicketAction(formData: FormData) {
  const user = await requireStaff();
  const ticketId = String(formData.get("ticketId"));
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  const priority = String(formData.get("priority") ?? ticket.priority);
  const category = String(formData.get("category") ?? ticket.category);
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const customerId = String(formData.get("customerId") ?? "") || null;

  const changes: string[] = [];
  if (priority !== ticket.priority) changes.push(`prioridade → ${label(TICKET_PRIORITIES, priority)}`);
  if (category !== ticket.category) changes.push(`categoria → ${label(TICKET_CATEGORIES, category)}`);
  if (assigneeId !== ticket.assigneeId) changes.push("responsável alterado");
  if (customerId !== ticket.customerId) changes.push("cliente vinculado");

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      priority,
      category,
      assigneeId,
      customerId,
      // recalcula o SLA a partir da abertura quando a prioridade muda
      slaDueAt: priority !== ticket.priority ? slaDueAt(priority, ticket.createdAt) : undefined,
    },
  });
  if (changes.length) {
    await prisma.ticketMessage.create({ data: { ticketId, authorType: "SYSTEM", internal: true, body: `${user.name}: ${changes.join(", ")}` } });
  }
  revalidatePath(`/admin/chamados/${ticketId}`);
}

export async function suggestReplyAction(ticketId: string): Promise<string> {
  await requireStaff();
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { customer: true, messages: { orderBy: { createdAt: "asc" }, include: { author: true } } },
  });
  const knowledge = await prisma.knowledgeArticle.findMany({ where: { published: true } });
  try {
    return await suggestReply({
      subject: ticket.subject,
      category: label(TICKET_CATEGORIES, ticket.category),
      customerName: ticket.customer?.name ?? ticket.contactName,
      history: ticket.messages.map((m) => ({
        author: `${m.authorType}${m.internal ? " (nota interna)" : ""}`,
        body: m.body,
      })),
      knowledge: knowledge.map((k) => ({ question: k.question, answer: k.answer })),
    });
  } catch (e) {
    console.error(e);
    return "";
  }
}
