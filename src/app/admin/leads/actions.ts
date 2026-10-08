"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { LEAD_STAGES, label } from "@/lib/constants";

const STAFF = ["ADMIN", "AGENT"];

function leadData(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
  const value = Number(fd.get("value"));
  return {
    name: String(fd.get("name") ?? "").trim(),
    company: s("company"),
    email: s("email"),
    phone: s("phone"),
    source: s("source") ?? "OUTRO",
    stage: s("stage") ?? "NEW",
    interest: s("interest"),
    value: value > 0 ? value : null,
    notes: s("notes"),
    ownerId: s("ownerId"),
  };
}

export async function createLeadAction(fd: FormData) {
  const user = await requireStaff(STAFF);
  const data = leadData(fd);
  if (!data.name) redirect("/admin/leads/novo");
  const lead = await prisma.lead.create({
    data: { ...data, ownerId: data.ownerId ?? user.id, activities: { create: { type: "SYSTEM", description: "Lead cadastrado", userId: user.id } } },
  });
  redirect(`/admin/leads/${lead.id}`);
}

export async function updateLeadAction(fd: FormData) {
  const user = await requireStaff(STAFF);
  const id = String(fd.get("id"));
  const before = await prisma.lead.findUniqueOrThrow({ where: { id } });
  const data = leadData(fd);
  await prisma.lead.update({ where: { id }, data });
  if (before.stage !== data.stage) {
    await prisma.activity.create({ data: { leadId: id, type: "SYSTEM", userId: user.id, description: `Etapa: ${label(LEAD_STAGES, before.stage)} → ${label(LEAD_STAGES, data.stage)}` } });
  }
  revalidatePath(`/admin/leads/${id}`);
}

export async function moveLeadAction(fd: FormData) {
  const user = await requireStaff(STAFF);
  const id = String(fd.get("id"));
  const stage = String(fd.get("stage"));
  const before = await prisma.lead.findUniqueOrThrow({ where: { id } });
  await prisma.lead.update({ where: { id }, data: { stage } });
  await prisma.activity.create({ data: { leadId: id, type: "SYSTEM", userId: user.id, description: `Etapa: ${label(LEAD_STAGES, before.stage)} → ${label(LEAD_STAGES, stage)}` } });
  revalidatePath("/admin/leads");
}

export async function deleteLeadAction(fd: FormData) {
  await requireStaff(STAFF);
  await prisma.lead.delete({ where: { id: String(fd.get("id")) } });
  redirect("/admin/leads");
}
