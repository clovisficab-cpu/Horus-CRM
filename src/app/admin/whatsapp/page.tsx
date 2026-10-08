import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { whatsappEnabled } from "@/lib/whatsapp";
import { dateTime } from "@/lib/format";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { simulateIncomingAction } from "./actions";

export default async function WhatsAppInbox({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const sp = await searchParams;
  await requireStaff();
  const conversations = await prisma.whatsAppConversation.findMany({
    where: sp.mode ? { mode: sp.mode } : {},
    orderBy: [{ unread: "desc" }, { lastMessageAt: "desc" }],
    include: { customer: { select: { name: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 100,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <PageHeader
          title="WhatsApp"
          subtitle="Conversas atendidas pela IA e pela equipe"
          actions={
            <div className="flex gap-2 text-sm">
              <Link href="/admin/whatsapp" className="btn-outline">Todas</Link>
              <Link href="/admin/whatsapp?mode=HUMAN" className="btn-outline">Aguardando humano</Link>
              <Link href="/admin/whatsapp?mode=BOT" className="btn-outline">Com o bot</Link>
            </div>
          }
        />
        {conversations.length === 0 ? <Empty>Nenhuma conversa ainda.</Empty> : (
          <div className="card divide-y divide-slate-100">
            {conversations.map((c) => (
              <Link key={c.id} href={`/admin/whatsapp/${c.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-horus-900">{c.customer?.name ?? c.contactName ?? c.phone}</strong>
                    <Badge value={c.mode}>{c.mode === "BOT" ? "🤖 Bot" : "👤 Humano"}</Badge>
                    {!c.customer && <Badge tone="gray">não cliente</Badge>}
                  </div>
                  <p className="truncate text-sm text-slate-500">{c.messages[0]?.body}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  {dateTime(c.lastMessageAt)}
                  {c.unread > 0 && <div className="mt-1"><span className="rounded-full bg-gold-500 px-2 font-bold text-horus-950">{c.unread}</span></div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card title="Status da integração">
          <p className="text-sm">
            {whatsappEnabled() ? (
              <Badge tone="green">Conectado à WhatsApp Cloud API</Badge>
            ) : (
              <>
                <Badge tone="yellow">Modo simulação</Badge>
                <span className="mt-2 block text-slate-500">Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID para enviar mensagens reais. Webhook: <code className="text-xs">/api/whatsapp/webhook</code></span>
              </>
            )}
          </p>
        </Card>
        <Card title="🧪 Simulador de mensagem recebida">
          <form action={simulateIncomingAction} className="grid gap-3">
            <Field label="Telefone (com DDD)"><input name="phone" required defaultValue="11988887777" className="input" /></Field>
            <Field label="Nome no WhatsApp"><input name="name" defaultValue="Cliente Teste" className="input" /></Field>
            <Field label="Mensagem"><textarea name="text" required rows={3} className="input" defaultValue="Oi, a câmera da garagem está sem imagem desde ontem" /></Field>
            <SubmitButton className="btn-gold" pendingText="Processando...">Simular recebimento</SubmitButton>
          </form>
          <p className="mt-2 text-xs text-slate-500">Útil para testar o fluxo da IA (triagem, abertura de chamado, transferência) sem um número real.</p>
        </Card>
      </div>
    </div>
  );
}
