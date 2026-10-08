"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireStaff } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";

const STAFF = ["ADMIN", "AGENT"];

function customerData(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
  return {
    name: String(fd.get("name") ?? "").trim(),
    type: s("type") ?? "PJ",
    document: s("document"),
    email: s("email"),
    phone: s("phone"),
    whatsapp: normalizePhone(s("whatsapp") ?? s("phone")) || null,
    address: s("address"),
    city: s("city"),
    state: s("state"),
    status: s("status") ?? "ACTIVE",
    notes: s("notes"),
  };
}

export async function createCustomerAction(fd: FormData) {
  const user = await requireStaff(STAFF);
  const data = customerData(fd);
  if (!data.name) redirect("/admin/clientes/novo?erro=1");
  const leadId = String(fd.get("leadId") ?? "");
  const customer = await prisma.customer.create({
    data: { ...data, activities: { create: { type: "SYSTEM", description: "Cliente cadastrado", userId: user.id } } },
  });
  if (leadId) {
    await prisma.lead.update({ where: { id: leadId }, data: { stage: "WON", customerId: customer.id } });
  }
  redirect(`/admin/clientes/${customer.id}`);
}

export async function updateCustomerAction(fd: FormData) {
  await requireStaff(STAFF);
  const id = String(fd.get("id"));
  await prisma.customer.update({ where: { id }, data: customerData(fd) });
  revalidatePath(`/admin/clientes/${id}`);
}

export async function deleteCustomerAction(fd: FormData) {
  await requireStaff(["ADMIN"]);
  await prisma.customer.delete({ where: { id: String(fd.get("id")) } });
  redirect("/admin/clientes");
}

export async function addActivityAction(fd: FormData) {
  const user = await requireStaff();
  const customerId = String(fd.get("customerId") ?? "") || null;
  const leadId = String(fd.get("leadId") ?? "") || null;
  const description = String(fd.get("description") ?? "").trim();
  if (description) {
    await prisma.activity.create({
      data: { type: String(fd.get("type") ?? "NOTE"), description, customerId, leadId, userId: user.id },
    });
  }
  if (customerId) revalidatePath(`/admin/clientes/${customerId}`);
  if (leadId) revalidatePath(`/admin/leads/${leadId}`);
}

/** Cria (ou redefine a senha de) um acesso ao portal do cliente */
export async function createPortalUserAction(fd: FormData) {
  await requireStaff(STAFF);
  const customerId = String(fd.get("customerId"));
  const email = String(fd.get("email") ?? "").toLowerCase().trim();
  const password = String(fd.get("password") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!email || password.length < 6) redirect(`/admin/clientes/${customerId}?erro=senha`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.customerId !== customerId) redirect(`/admin/clientes/${customerId}?erro=email`);
  const passwordHash = await hashPassword(password);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, active: true, name: name || existing.name } });
  } else {
    await prisma.user.create({ data: { email, passwordHash, name: name || email, role: "CLIENT", customerId } });
  }
  revalidatePath(`/admin/clientes/${customerId}`);
}

export async function togglePortalUserAction(fd: FormData) {
  await requireStaff(STAFF);
  const id = String(fd.get("userId"));
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (u.role !== "CLIENT") return;
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath(`/admin/clientes/${u.customerId}`);
}
