"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function submitContact(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || (!phone && !email)) redirect("/contato?erro=1");
  // campo-armadilha anti-spam
  if (formData.get("website")) redirect("/contato?enviado=1");

  await prisma.lead.create({
    data: {
      name: name.slice(0, 120),
      company: String(formData.get("company") ?? "").slice(0, 120) || null,
      phone: phone.slice(0, 30) || null,
      email: email.slice(0, 120) || null,
      interest: String(formData.get("interest") ?? "") || null,
      notes: String(formData.get("message") ?? "").slice(0, 2000) || null,
      source: "SITE",
      activities: { create: { type: "SYSTEM", description: "Lead criado pelo formulário do site" } },
    },
  });
  redirect("/contato?enviado=1");
}
