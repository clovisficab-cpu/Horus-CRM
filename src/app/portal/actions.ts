"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { createTicket } from "@/lib/tickets";

export async function openTicketAction(formData: FormData) {
  const user = await requireClient();
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!subject || !description) redirect("/portal/chamados/novo?erro=1");

  let cameraId = String(formData.get("cameraId") ?? "") || null;
  if (cameraId) {
    const cam = await prisma.camera.findFirst({ where: { id: cameraId, customerId: user.customerId } });
    if (!cam) cameraId = null;
  }

  const ticket = await createTicket({
    subject: subject.slice(0, 200),
    description: description.slice(0, 5000),
    customerId: user.customerId,
    cameraId,
    channel: "PORTAL",
    category: String(formData.get("category") ?? "") || null,
    contactName: user.name,
    contactPhone: user.phone,
    authorType: "CUSTOMER",
    authorId: user.id,
  });
  redirect(`/portal/chamados/${ticket.id}`);
}

async function ownTicket(ticketId: string, customerId: string) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, customerId } });
  if (!ticket) redirect("/portal/chamados");
  return ticket;
}

export async function replyTicketAction(formData: FormData) {
  const user = await requireClient();
  const ticket = await ownTicket(String(formData.get("ticketId")), user.customerId);
  const body = String(formData.get("body") ?? "").trim();
  if (body) {
    await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorType: "CUSTOMER", authorId: user.id, body: body.slice(0, 5000) } });
    // cliente respondeu: volta para a fila; chamado resolvido é reaberto
    if (["WAITING_CUSTOMER", "RESOLVED"].includes(ticket.status)) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS", resolvedAt: null } });
    }
  }
  revalidatePath(`/portal/chamados/${ticket.id}`);
}

export async function rateTicketAction(formData: FormData) {
  const user = await requireClient();
  const ticket = await ownTicket(String(formData.get("ticketId")), user.customerId);
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 0));
  await prisma.ticket.update({ where: { id: ticket.id }, data: { rating, status: "CLOSED" } });
  revalidatePath(`/portal/chamados/${ticket.id}`);
}
