"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { SERVICE_ORDER_TYPES, label } from "@/lib/constants";
import { dateTime } from "@/lib/format";

function orderData(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
  return {
    type: s("type") ?? "MAINTENANCE",
    status: s("status") ?? "SCHEDULED",
    customerId: String(fd.get("customerId")),
    ticketId: s("ticketId"),
    technicianId: s("technicianId"),
    scheduledAt: new Date(String(fd.get("scheduledAt"))),
    address: s("address"),
    notes: s("notes"),
    report: s("report"),
  };
}

export async function createOrderAction(fd: FormData) {
  const user = await requireStaff();
  const data = orderData(fd);
  if (!data.address) {
    const c = await prisma.customer.findUnique({ where: { id: data.customerId } });
    data.address = [c?.address, c?.city].filter(Boolean).join(" - ") || null;
  }
  const order = await prisma.serviceOrder.create({ data });
  const text = `Visita de ${label(SERVICE_ORDER_TYPES, data.type).toLowerCase()} agendada para ${dateTime(data.scheduledAt)}`;
  await prisma.activity.create({ data: { customerId: data.customerId, type: "VISIT", userId: user.id, description: text } });
  if (data.ticketId) {
    await prisma.ticketMessage.create({ data: { ticketId: data.ticketId, authorType: "SYSTEM", body: `${text}.` } });
  }
  redirect(`/admin/ordens/${order.id}`);
}

export async function updateOrderAction(fd: FormData) {
  const user = await requireStaff();
  const id = String(fd.get("id"));
  const before = await prisma.serviceOrder.findUniqueOrThrow({ where: { id } });
  const data = orderData(fd);
  const done = data.status === "DONE" && before.status !== "DONE";
  await prisma.serviceOrder.update({ where: { id }, data: { ...data, completedAt: done ? new Date() : before.completedAt } });
  if (done) {
    await prisma.activity.create({ data: { customerId: data.customerId, type: "VISIT", userId: user.id, description: `Visita concluída. ${data.report ?? ""}` } });
    if (data.ticketId) {
      await prisma.ticketMessage.create({ data: { ticketId: data.ticketId, authorType: "SYSTEM", internal: true, body: `OS concluída por ${user.name}.\nRelatório: ${data.report ?? "—"}` } });
    }
  }
  revalidatePath(`/admin/ordens/${id}`);
}
