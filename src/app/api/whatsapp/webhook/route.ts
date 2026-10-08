import { NextResponse, after, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleIncomingMessage } from "@/lib/bot";
import { verifyWebhookSignature, type WebhookPayload } from "@/lib/whatsapp";

// Verificação do webhook (configuração no painel da Meta)
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Recebimento de mensagens e status de entrega
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Responde 200 imediatamente; o processamento (IA) roda em segundo plano
  after(async () => {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        for (const st of value.statuses ?? []) {
          await prisma.whatsAppMessage.updateMany({ where: { waMessageId: st.id }, data: { status: st.status } });
        }

        for (const msg of value.messages ?? []) {
          const text =
            msg.text?.body ??
            msg.button?.text ??
            msg.interactive?.button_reply?.title ??
            msg.interactive?.list_reply?.title ??
            `[${msg.type} recebido — formato ainda não suportado pelo bot]`;
          const contact = value.contacts?.find((c) => c.wa_id === msg.from);
          try {
            await handleIncomingMessage({
              phone: msg.from,
              text,
              contactName: contact?.profile?.name,
              waMessageId: msg.id,
            });
          } catch (e) {
            console.error("[whatsapp] erro ao processar mensagem", e);
          }
        }
      }
    }
  });

  return NextResponse.json({ ok: true });
}
