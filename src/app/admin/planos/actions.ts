"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export async function savePlanAction(fd: FormData) {
  await requireStaff(["ADMIN"]);
  const id = String(fd.get("id") ?? "");
  const data = {
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim() || null,
    monthlyPrice: Number(fd.get("monthlyPrice")) || 0,
    cameraLimit: Number(fd.get("cameraLimit")) || 1,
    retentionDays: Number(fd.get("retentionDays")) || 7,
    features: String(fd.get("features") ?? "").trim() || null,
    featured: fd.get("featured") === "on",
    active: fd.get("active") === "on",
  };
  if (!data.name) return;
  if (id) await prisma.plan.update({ where: { id }, data });
  else await prisma.plan.create({ data });
  revalidatePath("/admin/planos");
}
