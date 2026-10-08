import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime, ticketCode } from "@/lib/format";
import { CAMERA_STATUS, SERVICE_ORDER_STATUS, TICKET_CATEGORIES, TICKET_CHANNELS, TICKET_PRIORITIES, TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Card, Field, PageHeader, Select } from "@/components/ui";
import TicketThread from "@/components/TicketThread";
import SubmitButton from "@/components/SubmitButton";
import ReplyBox from "../ReplyBox";
import { updateTicketAction } from "../actions";

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: true,
      camera: true,
      assignee: true,
      serviceOrders: { orderBy: { scheduledAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket) notFound();
  const [staff, customers] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "CLIENT" }, active: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const breached = ticket.slaDueAt && ticket.slaDueAt < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <PageHeader
          title={`${ticketCode(ticket.number)} · ${ticket.subject}`}
          subtitle={`Aberto em ${dateTime(ticket.createdAt)} via ${label(TICKET_CHANNELS, ticket.channel)}`}
          actions={<Badge value={ticket.status}>{label(TICKET_STATUS, ticket.status)}</Badge>}
        />
        {ticket.aiSummary && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
            <strong className="text-violet-800">🤖 Resumo da IA:</strong> {ticket.aiSummary}
          </div>
        )}
        <TicketThread messages={ticket.messages} viewer="staff" />
        <ReplyBox ticketId={ticket.id} status={ticket.status} whatsapp={ticket.channel === "WHATSAPP" && !!ticket.contactPhone} />
      </div>

      <div className="space-y-4">
        <Card title="Classificação">
          <form action={updateTicketAction} className="grid gap-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Field label="Cliente"><Select name="customerId" options={customers.map((c) => [c.id, c.name] as [string, string])} defaultValue={ticket.customerId} includeEmpty="— não vinculado —" /></Field>
            <Field label="Responsável"><Select name="assigneeId" options={staff.map((u) => [u.id, u.name] as [string, string])} defaultValue={ticket.assigneeId} includeEmpty="— fila —" /></Field>
            <Field label="Prioridade"><Select name="priority" options={TICKET_PRIORITIES} defaultValue={ticket.priority} /></Field>
            <Field label="Categoria"><Select name="category" options={TICKET_CATEGORIES} defaultValue={ticket.category} /></Field>
            <SubmitButton className="btn-outline">Salvar</SubmitButton>
          </form>
          <div className={`mt-4 text-sm ${breached ? "font-semibold text-red-600" : "text-slate-500"}`}>
            SLA: {dateTime(ticket.slaDueAt)} {breached && "(estourado)"}
          </div>
          {ticket.rating && <div className="mt-1 text-sm">Avaliação: {"⭐".repeat(ticket.rating)}</div>}
        </Card>

        <Card title="Contato">
          <dl className="space-y-2 text-sm">
            {ticket.customer && (
              <div><dt className="label">Cliente</dt><dd><Link href={`/admin/clientes/${ticket.customer.id}`} className="text-gold-600 hover:underline">{ticket.customer.name}</Link></dd></div>
            )}
            <div><dt className="label">Nome</dt><dd>{ticket.contactName ?? "—"}</dd></div>
            <div><dt className="label">Telefone</dt><dd>{ticket.contactPhone ?? ticket.customer?.phone ?? "—"}</dd></div>
            {ticket.camera && (
              <div><dt className="label">Câmera</dt><dd>{ticket.camera.name} <Badge value={ticket.camera.status}>{label(CAMERA_STATUS, ticket.camera.status)}</Badge></dd></div>
            )}
          </dl>
        </Card>

        <Card title="Ordens de serviço" actions={ticket.customerId && <Link href={`/admin/ordens/nova?ticket=${ticket.id}&customer=${ticket.customerId}`} className="text-sm text-gold-600 hover:underline">+ agendar visita</Link>}>
          {ticket.serviceOrders.length === 0 ? <p className="text-sm text-slate-500">Nenhuma visita agendada.</p> : (
            <ul className="space-y-2 text-sm">
              {ticket.serviceOrders.map((o) => (
                <li key={o.id}><Link href={`/admin/ordens/${o.id}`} className="hover:text-gold-600">{dateTime(o.scheduledAt)}</Link> <Badge value={o.status}>{label(SERVICE_ORDER_STATUS, o.status)}</Badge></li>
              ))}
            </ul>
          )}
          {!ticket.customerId && <p className="mt-2 text-xs text-slate-500">Vincule um cliente para agendar visitas.</p>}
        </Card>
      </div>
    </div>
  );
}
