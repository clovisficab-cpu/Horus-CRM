import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { STAFF_ROLES } from "./constants";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const token = await signSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    customerId: user.customerId,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return user;
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Usuário atual (recarregado do banco para refletir desativações) */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;
  return user;
}

export async function requireStaff(roles: string[] = STAFF_ROLES) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!roles.includes(user.role)) redirect(user.role === "CLIENT" ? "/portal" : "/admin");
  return user;
}

export async function requireClient() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal");
  if (user.role !== "CLIENT" || !user.customerId) redirect("/admin");
  return user as typeof user & { customerId: string };
}
