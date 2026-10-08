import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl, date, ticketCode } from "@/lib/format";
import { TICKET_STATUS, label } from "@/lib/constants";
import { Badge, Card, Empty, Stat } from "@/components/ui";

export default async function PortalHome() {
  const user = await requireClient();
  const cid = user.customerId;
  const [cameras, tickets, invoices, banners] = await Promise.all([
    prisma.camera.findMany({ where: { customerId: cid } }),
    prisma.ticket.findMany({ where: { customerId: cid, status: { notIn: ["CLOSED"] } }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.invoice.findMany({ where: { customerId: cid, status: { in: ["OPEN", "OVERDUE"] } }, orderBy: { dueDate: "asc" } }),
    prisma.banner.findMany({ where: { active: true, placement: "PORTAL" }, orderBy: { order: "asc" } }),
  ]);
  const online = cameras.filter((c) => c.status === "ONLINE").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-horus-900">Olá, {user.name.split(" ")[0]} 👋</h1>

      {banners.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-horus-900 to-horus-700 p-6 text-white">
          <div>
            <h2 className="text-lg font-bold">{b.title}</h2>
            {b.subtitle && <p className="text-sm text-slate-300">{b.subtitle}</p>}
          </div>
          {b.ctaUrl && <Link href={b.ctaUrl} className="btn-gold">{b.ctaLabel ?? "Saiba mais"}</Link>}
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Câmeras online" value={`${online}/${cameras.length}`} tone={online < cameras.length ? "warn" : "ok"} href="/portal/cameras" />
        <Stat label="Chamados em aberto" value={tickets.filter((t) => t.status !== "RESOLVED").length} href="/portal/chamados" />
        <Stat label="Faturas em aberto" value={invoices.length} tone={invoices.some((i) => i.status === "OVERDUE") ? "danger" : "default"} href="/portal/financeiro" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Chamados recentes" actions={<Link href="/portal/chamados/novo" className="btn-gold">Abrir chamado</Link>}>
          {tickets.length === 0 ? (
            <Empty>Nenhum chamado em aberto. 🎉</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/portal/chamados/${t.id}`} className="flex items-center justify-between gap-2 py-3 hover:text-gold-600">
                    <span className="text-sm"><span className="font-mono text-slate-400">{ticketCode(t.number)}</span> {t.subject}</span>
                    <Badge value={t.status}>{label(TICKET_STATUS, t.status)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Faturas em aberto">
          {invoices.length === 0 ? (
            <Empty>Tudo em dia! ✅</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                  <span>Ref. {i.reference} — venc. {date(i.dueDate)}</span>
                  <span className="flex items-center gap-2 font-semibold">
                    {brl(i.amount)} {i.status === "OVERDUE" && <Badge value="OVERDUE">Vencida</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
