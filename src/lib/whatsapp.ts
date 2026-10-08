import "server-only";
import crypto from "node:crypto";

// Cliente mínimo da WhatsApp Cloud API (Meta).
// Sem WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID a mensagem é apenas registrada (modo simulação).

const GRAPH_URL = "https://graph.facebook.com/v21.0";

export function whatsappEnabled() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppText(to: string, body: string): Promise<{ id: string | null; status: string }> {
  if (!whatsappEnabled()) {
    console.info(`[whatsapp:simulado] -> ${to}: ${body}`);
    return { id: null, status: "simulated" };
  }
  const res = await fetch(`${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: true, body },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: unknown };
  if (!res.ok) {
    console.error("[whatsapp] falha no envio", data.error ?? res.status);
    return { id: null, status: "failed" };
  }
  return { id: data.messages?.[0]?.id ?? null, status: "sent" };
}

/** Valida o cabeçalho X-Hub-Signature-256 enviado pela Meta */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // validação desativada (desenvolvimento)
  if (!signature?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = signature.slice(7);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Estrutura relevante do payload de webhook da Meta */
export type WebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          button?: { text: string };
          interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
        }[];
        statuses?: { id: string; status: string }[];
      };
    }[];
  }[];
};
