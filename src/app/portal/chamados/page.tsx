import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime, ticketCode } from "@/lib/format";
import { TICKET_CATEGORIES, TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Empty, PageHeader } from "@/components/ui";

export default async function PortalTickets() {
  const user = await requireClient();
  const tickets = await prisma.ticket.findMany({ where: { customerId: user.customerId }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title="Meus chamados" subtitle="Acompanhe suas solicitações de suporte" actions={<Link href="/portal/chamados/novo" className="btn-gold">Abrir chamado</Link>} />
      {tickets.length === 0 ? (
        <Empty>Você ainda não abriu nenhum chamado.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Protocolo</th><th>Assunto</th><th>Categoria</th><th>Status</th><th>Aberto em</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono">{ticketCode(t.number)}</td>
                  <td><Link href={`/portal/chamados/${t.id}`} className="font-medium text-horus-900 hover:text-gold-600">{t.subject}</Link></td>
                  <td>{label(TICKET_CATEGORIES, t.category)}</td>
                  <td><Badge value={t.status}>{label(TICKET_STATUS, t.status)}</Badge></td>
                  <td>{dateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
