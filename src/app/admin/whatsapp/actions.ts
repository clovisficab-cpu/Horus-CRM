"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { handleIncomingMessage, sendConversationMessage } from "@/lib/bot";
import { normalizePhone } from "@/lib/format";

export async function agentSendAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("conversationId"));
  const body = String(formData.get("body") ?? "").trim();
  const conv = await prisma.whatsAppConversation.findUniqueOrThrow({ where: { id } });
  if (body) {
    // ao responder manualmente a conversa passa para atendimento humano
    await prisma.whatsAppConversation.update({ where: { id }, data: { mode: "HUMAN", unread: 0 } });
    await sendConversationMessage(id, conv.phone, body, "AGENT");
  }
  revalidatePath(`/admin/whatsapp/${id}`);
}

export async function setModeAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("conversationId"));
  const mode = String(formData.get("mode")) === "BOT" ? "BOT" : "HUMAN";
  const conv = await prisma.whatsAppConversation.update({ where: { id }, data: { mode, unread: 0 } });
  if (mode === "BOT") {
    await sendConversationMessage(id, conv.phone, "Atendimento encerrado pelo atendente. Se precisar de algo mais, é só mandar mensagem! 😊", "SYSTEM");
  }
  revalidatePath(`/admin/whatsapp/${id}`);
}

export async function linkCustomerAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("conversationId"));
  const customerId = String(formData.get("customerId") ?? "") || null;
  await prisma.whatsAppConversation.update({ where: { id }, data: { customerId } });
  revalidatePath(`/admin/whatsapp/${id}`);
}

/** Simulador: injeta uma mensagem como se tivesse chegado pelo webhook */
export async function simulateIncomingAction(formData: FormData) {
  await requireStaff();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const text = String(formData.get("text") ?? "").trim();
  const contactName = String(formData.get("name") ?? "").trim() || undefined;
  if (!phone || !text) redirect("/admin/whatsapp?erro=1");
  await handleIncomingMessage({ phone, text, contactName });
  const conv = await prisma.whatsAppConversation.findUnique({ where: { phone } });
  redirect(conv ? `/admin/whatsapp/${conv.id}` : "/admin/whatsapp");
}
