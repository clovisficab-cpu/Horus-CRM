import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { whatsappEnabled } from "@/lib/whatsapp";
import { brl, dateTime, ticketCode } from "@/lib/format";
import { LEAD_STAGES, TICKET_PRIORITIES, TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";

export default async function Dashboard() {
  await requireStaff();
  const now = new Date();
  const active = { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] };
  const [openTickets, slaBreached, camerasOffline, camerasTotal, customers, mrr, overdue, leadsByStage, urgent, waHuman, todayOrders, ratings] =
    await Promise.all([
      prisma.ticket.count({ where: { status: active } }),
      prisma.ticket.count({ where: { status: active, slaDueAt: { lt: now } } }),
      prisma.camera.count({ where: { status: "OFFLINE", customerId: { not: null } } }),
      prisma.camera.count({ where: { customerId: { not: null } } }),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.contract.aggregate({ _sum: { monthlyValue: true }, where: { status: "ACTIVE" } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, _count: true, where: { status: "OVERDUE" } }),
      prisma.lead.groupBy({ by: ["stage"], _count: true, _sum: { value: true }, where: { stage: { notIn: ["WON", "LOST"] } } }),
      prisma.ticket.findMany({
        where: { status: active },
        orderBy: [{ slaDueAt: "asc" }],
        take: 8,
        include: { customer: { select: { name: true } } },
      }),
      prisma.whatsAppConversation.count({ where: { mode: "HUMAN" } }),
      prisma.serviceOrder.findMany({
        where: {
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          scheduledAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) },
        },
        include: { customer: { select: { name: true } }, technician: { select: { name: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.ticket.aggregate({ _avg: { rating: true }, _count: { rating: true }, where: { rating: { not: null } } }),
    ]);

  const pipelineValue = leadsByStage.reduce((s, l) => s + (l._sum.value ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          <span className="flex flex-wrap gap-2">
            <Badge tone={aiEnabled() ? "green" : "yellow"}>IA {aiEnabled() ? "ativa" : "em modo regras (sem ANTHROPIC_API_KEY)"}</Badge>
            <Badge tone={whatsappEnabled() ? "green" : "yellow"}>WhatsApp {whatsappEnabled() ? "conectado" : "em modo simulação"}</Badge>
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Chamados ativos" value={openTickets} hint={`${slaBreached} com SLA estourado`} tone={slaBreached ? "danger" : "default"} href="/admin/chamados" />
        <Stat label="Câmeras offline" value={`${camerasOffline}/${camerasTotal}`} tone={camerasOffline ? "warn" : "ok"} href="/admin/cameras?status=OFFLINE" />
        <Stat label="Receita recorrente (MRR)" value={brl(mrr._sum.monthlyValue ?? 0)} hint={`${customers} clientes ativos`} href="/admin/financeiro" />
        <Stat label="Inadimplência" value={brl(overdue._sum.amount ?? 0)} hint={`${overdue._count} faturas vencidas`} tone={overdue._count ? "danger" : "ok"} href="/admin/financeiro?status=OVERDUE" />
        <Stat label="Funil em aberto" value={brl(pipelineValue)} hint="valor mensal estimado" href="/admin/leads" />
        <Stat label="WhatsApp aguardando humano" value={waHuman} tone={waHuman ? "warn" : "ok"} href="/admin/whatsapp" />
        <Stat label="Visitas técnicas hoje" value={todayOrders.length} href="/admin/ordens" />
        <Stat label="Satisfação (CSAT)" value={ratings._avg.rating ? `${ratings._avg.rating.toFixed(1)} ⭐` : "—"} hint={`${ratings._count.rating} avaliações`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Fila de chamados por SLA" className="xl:col-span-2" actions={<Link href="/admin/chamados" className="text-sm text-gold-600 hover:underline">ver todos</Link>}>
          {urgent.length === 0 ? <Empty>Nenhum chamado ativo.</Empty> : (
            <table className="table">
              <thead><tr><th>#</th><th>Assunto</th><th>Cliente</th><th>Prioridade</th><th>Status</th><th>SLA</th></tr></thead>
              <tbody>
                {urgent.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{ticketCode(t.number)}</td>
                    <td><Link href={`/admin/chamados/${t.id}`} className="font-medium hover:text-gold-600">{t.subject}</Link></td>
                    <td className="text-slate-500">{t.customer?.name ?? t.contactName ?? "—"}</td>
                    <td><Badge value={t.priority}>{label(TICKET_PRIORITIES, t.priority)}</Badge></td>
                    <td><Badge value={t.status}>{label(TICKET_STATUS, t.status)}</Badge></td>
                    <td className={t.slaDueAt && t.slaDueAt < now ? "font-semibold text-red-600" : "text-slate-500"}>{dateTime(t.slaDueAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Funil de vendas">
            <ul className="space-y-2 text-sm">
              {Object.entries(LEAD_STAGES).filter(([k]) => !["WON", "LOST"].includes(k)).map(([k, v]) => {
                const row = leadsByStage.find((l) => l.stage === k);
                return (
                  <li key={k} className="flex justify-between">
                    <span>{v}</span>
                    <span className="font-semibold">{row?._count ?? 0} · {brl(row?._sum.value ?? 0)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Agenda técnica de hoje">
            {todayOrders.length === 0 ? <Empty>Sem visitas hoje.</Empty> : (
              <ul className="space-y-2 text-sm">
                {todayOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/ordens/${o.id}`} className="hover:text-gold-600">
                      <strong>{o.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</strong> {o.customer.name}
                      <span className="text-slate-500"> · {o.technician?.name ?? "sem técnico"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
