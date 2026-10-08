"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, login } from "@/lib/auth";
import { DEMO_EMAILS, seedDemo } from "@/lib/demo-data";

/** Configuração inicial: só funciona enquanto não houver nenhum usuário no banco */
export type SetupState = { error: string; name: string; email: string; demo: boolean } | null;

export async function setupAction(_prev: SetupState, fd: FormData): Promise<SetupState> {
  if ((await prisma.user.count()) > 0) redirect("/login");

  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").toLowerCase().trim();
  const password = String(fd.get("password") ?? "");
  const demo = fd.get("demo") === "on";
  // o React limpa o formulário após o envio: devolvemos os valores para não perder o que foi digitado
  const fail = (error: string) => ({ error, name, email, demo });

  const token = process.env.SETUP_TOKEN;
  if (process.env.NODE_ENV === "production" && !token) return fail("Defina a variável SETUP_TOKEN na hospedagem antes de configurar.");
  if (token && fd.get("token") !== token) return fail("Código de instalação inválido.");
  if (!name || !email) return fail("Informe nome e e-mail.");
  if (password.length < 8) return fail("A senha precisa ter pelo menos 8 caracteres.");
  if (password !== fd.get("confirm")) return fail("As senhas não conferem.");
  if (demo && Object.values(DEMO_EMAILS).includes(email)) return fail("Use outro e-mail: este é reservado para os usuários de demonstração.");

  const passwordHash = await hashPassword(password);
  if (demo) {
    // usuários de demonstração recebem a mesma senha do administrador
    await seedDemo(prisma, { admin: { name, email, passwordHash }, staffPasswordHash: passwordHash, clientPasswordHash: passwordHash });
  } else {
    await prisma.user.create({ data: { name, email, passwordHash, role: "ADMIN" } });
  }

  await login(email, password);
  redirect("/admin");
}
