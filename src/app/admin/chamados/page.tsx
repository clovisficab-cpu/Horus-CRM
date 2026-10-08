import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime, ticketCode } from "@/lib/format";
import { TICKET_CATEGORIES, TICKET_CHANNELS, TICKET_PRIORITIES, TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Empty, PageHeader, Select } from "@/components/ui";

type SP = { status?: string; priority?: string; category?: string; channel?: string; q?: string; mine?: string };

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const now = new Date();

  const where: Prisma.TicketWhereInput = {};
  if (sp.status === "ACTIVE" || !sp.status) where.status = { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] };
  else if (sp.status !== "ALL") where.status = sp.status;
  if (sp.priority) where.priority = sp.priority;
  if (sp.category) where.category = sp.category;
  if (sp.channel) where.channel = sp.channel;
  if (sp.mine) where.assigneeId = user.id;
  if (sp.q) {
    const n = Number(sp.q.replace(/\D/g, ""));
    where.OR = [
      { subject: { contains: sp.q, mode: "insensitive" } },
      { customer: { name: { contains: sp.q, mode: "insensitive" } } },
      { contactName: { contains: sp.q, mode: "insensitive" } },
      ...(n ? [{ number: n }] : []),
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ slaDueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { customer: { select: { name: true } }, assignee: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader title="Chamados" subtitle={`${tickets.length} resultado(s)`} actions={<Link href="/admin/chamados/novo" className="btn-gold">Novo chamado</Link>} />

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7">
        <input name="q" defaultValue={sp.q} placeholder="Buscar nº, assunto, cliente" className="input lg:col-span-2" />
        <Select name="status" options={{ ACTIVE: "Ativos", ALL: "Todos", ...TICKET_STATUS }} defaultValue={sp.status ?? "ACTIVE"} />
        <Select name="priority" options={TICKET_PRIORITIES} defaultValue={sp.priority} includeEmpty="Prioridade" />
        <Select name="category" options={TICKET_CATEGORIES} defaultValue={sp.category} includeEmpty="Categoria" />
        <Select name="channel" options={TICKET_CHANNELS} defaultValue={sp.channel} includeEmpty="Canal" />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="mine" defaultChecked={!!sp.mine} /> Meus</label>
          <button className="btn-primary">Filtrar</button>
        </div>
      </form>

      {tickets.length === 0 ? <Empty>Nenhum chamado encontrado.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Assunto</th><th>Cliente</th><th>Canal</th><th>Prioridade</th><th>Status</th><th>Responsável</th><th>SLA</th></tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const breached = t.slaDueAt && t.slaDueAt < now && !["RESOLVED", "CLOSED"].includes(t.status);
                return (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{ticketCode(t.number)}</td>
                    <td>
                      <Link href={`/admin/chamados/${t.id}`} className="font-medium text-horus-900 hover:text-gold-600">{t.subject}</Link>
                      <div className="text-xs text-slate-500">{label(TICKET_CATEGORIES, t.category)}</div>
                    </td>
                    <td>{t.customer?.name ?? <span className="text-slate-400">{t.contactName ?? "não identificado"}</span>}</td>
                    <td>{label(TICKET_CHANNELS, t.channel)}</td>
                    <td><Badge value={t.priority}>{label(TICKET_PRIORITIES, t.priority)}</Badge></td>
                    <td><Badge value={t.status}>{label(TICKET_STATUS, t.status)}</Badge></td>
                    <td>{t.assignee?.name ?? <span className="text-slate-400">—</span>}</td>
                    <td className={breached ? "font-semibold text-red-600" : "text-slate-500"}>{breached && "⚠ "}{dateTime(t.slaDueAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
