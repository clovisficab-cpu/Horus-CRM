import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime, ticketCode } from "@/lib/format";
import { TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Card, Field, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { agentSendAction, linkCustomerAction, setModeAction, simulateIncomingAction } from "../actions";

const SENDER: Record<string, string> = { CUSTOMER: "Cliente", AI: "🤖 IA", AGENT: "👤 Atendente", SYSTEM: "Sistema" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const conv = await prisma.whatsAppConversation.findUnique({
    where: { id },
    include: { customer: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) notFound();
  if (conv.unread) await prisma.whatsAppConversation.update({ where: { id }, data: { unread: 0 } });

  const [customers, tickets] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.ticket.findMany({ where: { contactPhone: conv.phone }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <PageHeader
          title={conv.customer?.name ?? conv.contactName ?? conv.phone}
          subtitle={`+${conv.phone}`}
          actions={
            <form action={setModeAction} className="flex items-center gap-2">
              <input type="hidden" name="conversationId" value={conv.id} />
              <Badge value={conv.mode}>{conv.mode === "BOT" ? "🤖 Atendimento pela IA" : "👤 Atendimento humano"}</Badge>
              {conv.mode === "BOT" ? (
                <button name="mode" value="HUMAN" className="btn-outline">Assumir conversa</button>
              ) : (
                <button name="mode" value="BOT" className="btn-outline">Devolver ao bot</button>
              )}
            </form>
          }
        />
        <div className="card max-h-[60vh] space-y-3 overflow-y-auto bg-[#efeae2] p-4">
          {conv.messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "OUT" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.direction === "OUT" ? (m.sender === "AI" ? "bg-violet-100" : "bg-[#d9fdd3]") : "bg-white"}`}>
                <div className="mb-0.5 text-[10px] font-semibold text-slate-500">{SENDER[m.sender] ?? m.sender}</div>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <div className="mt-1 text-right text-[10px] text-slate-400">{dateTime(m.createdAt)} {m.status && `· ${m.status}`}</div>
              </div>
            </div>
          ))}
        </div>
        <form action={agentSendAction} className="card mt-4 flex gap-2 p-3">
          <input type="hidden" name="conversationId" value={conv.id} />
          <input name="body" required placeholder="Responder como atendente (assume a conversa)..." className="input" />
          <SubmitButton pendingText="...">Enviar</SubmitButton>
        </form>
      </div>

      <div className="space-y-4">
        <Card title="Cliente">
          <form action={linkCustomerAction} className="grid gap-3">
            <input type="hidden" name="conversationId" value={conv.id} />
            <Field label="Vincular a cliente"><Select name="customerId" options={customers.map((c) => [c.id, c.name] as [string, string])} defaultValue={conv.customerId} includeEmpty="— não cliente —" /></Field>
            <SubmitButton className="btn-outline">Salvar</SubmitButton>
          </form>
          {conv.customer && <Link href={`/admin/clientes/${conv.customer.id}`} className="mt-3 block text-sm text-gold-600 hover:underline">Abrir ficha do cliente →</Link>}
          {!conv.customer && <Link href={`/admin/leads/novo?name=${encodeURIComponent(conv.contactName ?? "")}&phone=${conv.phone}&source=WHATSAPP`} className="mt-3 block text-sm text-gold-600 hover:underline">+ Criar lead com este contato</Link>}
        </Card>
        <Card title="Chamados deste número">
          {tickets.length === 0 ? <p className="text-sm text-slate-500">Nenhum.</p> : (
            <ul className="space-y-2 text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/chamados/${t.id}`} className="hover:text-gold-600">{ticketCode(t.number)} {t.subject}</Link>
                  <Badge value={t.status}>{label(TICKET_STATUS, t.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="🧪 Simular mensagem do cliente">
          <form action={simulateIncomingAction} className="grid gap-2">
            <input type="hidden" name="phone" value={conv.phone} />
            <input type="hidden" name="name" value={conv.contactName ?? ""} />
            <textarea name="text" rows={2} required className="input" />
            <SubmitButton className="btn-outline" pendingText="Processando...">Enviar como cliente</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
