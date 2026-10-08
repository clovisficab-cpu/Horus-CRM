// Assinatura/validação do token de sessão (compatível com o runtime edge do middleware)
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "horus_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type SessionPayload = {
  userId: string;
  role: string;
  name: string;
  customerId?: string | null;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET não configurado");
  }
  return new TextEncoder().encode(s || "dev-secret-horus");
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE;
