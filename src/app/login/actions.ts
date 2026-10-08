"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export async function loginAction(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const user = await login(email, password);
  if (!user) return "E-mail ou senha inválidos.";
  const home = user.role === "CLIENT" ? "/portal" : "/admin";
  // só aceita "next" interno e compatível com o perfil
  const safeNext = next.startsWith(home) ? next : home;
  redirect(safeNext);
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
