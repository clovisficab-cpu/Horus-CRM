"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export async function saveBannerAction(fd: FormData) {
  await requireStaff(["ADMIN"]);
  const id = String(fd.get("id") ?? "");
  const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
  const data = {
    title: String(fd.get("title") ?? "").trim(),
    subtitle: s("subtitle"),
    ctaLabel: s("ctaLabel"),
    ctaUrl: s("ctaUrl"),
    imageUrl: s("imageUrl"),
    placement: s("placement") ?? "HOME",
    order: Number(fd.get("order")) || 0,
    active: fd.get("active") === "on",
  };
  if (!data.title) return;
  if (id) await prisma.banner.update({ where: { id }, data });
  else await prisma.banner.create({ data });
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function deleteBannerAction(fd: FormData) {
  await requireStaff(["ADMIN"]);
  await prisma.banner.delete({ where: { id: String(fd.get("id")) } });
  revalidatePath("/admin/site");
}
