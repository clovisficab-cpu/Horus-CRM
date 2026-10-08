"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export async function saveArticleAction(fd: FormData) {
  await requireStaff(["ADMIN", "AGENT"]);
  const id = String(fd.get("id") ?? "");
  const data = {
    question: String(fd.get("question") ?? "").trim(),
    answer: String(fd.get("answer") ?? "").trim(),
    category: String(fd.get("category") ?? "").trim() || null,
    published: fd.get("published") === "on",
  };
  if (!data.question || !data.answer) return;
  if (id) await prisma.knowledgeArticle.update({ where: { id }, data });
  else await prisma.knowledgeArticle.create({ data });
  revalidatePath("/admin/conhecimento");
}

export async function deleteArticleAction(fd: FormData) {
  await requireStaff(["ADMIN", "AGENT"]);
  await prisma.knowledgeArticle.delete({ where: { id: String(fd.get("id")) } });
  revalidatePath("/admin/conhecimento");
}
