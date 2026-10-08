import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime, ticketCode } from "@/lib/format";
import { TICKET_CATEGORIES, TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Card, PageHeader } from "@/components/ui";
import TicketThread from "@/components/TicketThread";
import SubmitButton from "@/components/SubmitButton";
import { rateTicketAction, replyTicketAction } from "../../actions";

export default async function PortalTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireClient();
  const ticket = await prisma.ticket.findFirst({
    where: { id, customerId: user.customerId },
    include: { camera: true, messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } } },
  });
  if (!ticket) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PageHeader title={`${ticketCode(ticket.number)} · ${ticket.subject}`} subtitle={`Aberto em ${dateTime(ticket.createdAt)}`} />
        <TicketThread messages={ticket.messages} viewer="customer" />
        {ticket.status !== "CLOSED" && (
          <form action={replyTicketAction} className="card mt-6 grid gap-3 p-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea name="body" rows={3} required className="input" placeholder="Escreva uma mensagem para a equipe..." />
            <div className="flex justify-end"><SubmitButton pendingText="Enviando...">Enviar</SubmitButton></div>
          </form>
        )}
      </div>
      <div className="space-y-4">
        <Card title="Detalhes">
          <dl className="space-y-3 text-sm">
            <div><dt className="label">Status</dt><dd><Badge value={ticket.status}>{label(TICKET_STATUS, ticket.status)}</Badge></dd></div>
            <div><dt className="label">Categoria</dt><dd>{label(TICKET_CATEGORIES, ticket.category)}</dd></div>
            {ticket.camera && <div><dt className="label">Câmera</dt><dd>{ticket.camera.name}</dd></div>}
            {ticket.rating && <div><dt className="label">Sua avaliação</dt><dd>{"⭐".repeat(ticket.rating)}</dd></div>}
          </dl>
        </Card>
        {ticket.status === "RESOLVED" && !ticket.rating && (
          <Card title="Como foi o atendimento?">
            <form action={rateTicketAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} name="rating" value={n} className="btn-outline px-3">{n}⭐</button>
              ))}
            </form>
            <p className="mt-2 text-xs text-slate-500">Ao avaliar, o chamado é encerrado. Se o problema persistir, responda acima.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
