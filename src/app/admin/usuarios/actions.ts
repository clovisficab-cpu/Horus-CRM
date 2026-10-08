"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireStaff } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";

export async function saveStaffAction(fd: FormData) {
  const me = await requireStaff(["ADMIN"]);
  const id = String(fd.get("id") ?? "");
  const role = String(fd.get("role"));
  if (!STAFF_ROLES.includes(role)) return;
  const password = String(fd.get("password") ?? "");
  const data = {
    name: String(fd.get("name") ?? "").trim(),
    email: String(fd.get("email") ?? "").toLowerCase().trim(),
    phone: String(fd.get("phone") ?? "").trim() || null,
    role,
    active: fd.get("active") === "on" || id === me.id, // não permite se desativar
  };
  if (!data.name || !data.email) return;

  const clash = await prisma.user.findUnique({ where: { email: data.email } });
  if (clash && clash.id !== id) redirect("/admin/usuarios?erro=email");

  if (id) {
    await prisma.user.update({
      where: { id },
      data: { ...data, role: id === me.id ? me.role : data.role, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    });
  } else {
    if (password.length < 6) redirect("/admin/usuarios?erro=senha");
    await prisma.user.create({ data: { ...data, passwordHash: await hashPassword(password) } });
  }
  revalidatePath("/admin/usuarios");
}
