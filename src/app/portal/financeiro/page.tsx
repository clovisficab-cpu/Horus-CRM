import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl, date } from "@/lib/format";
import { CONTRACT_STATUS, INVOICE_STATUS, label } from "@/lib/constants";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export default async function PortalFinance() {
  const user = await requireClient();
  const [contracts, invoices] = await Promise.all([
    prisma.contract.findMany({ where: { customerId: user.customerId }, include: { plan: true } }),
    prisma.invoice.findMany({ where: { customerId: user.customerId }, orderBy: { dueDate: "desc" }, take: 24 }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Seu contrato e histórico de faturas" />
      <Card title="Contrato">
        {contracts.length === 0 ? <Empty>Nenhum contrato encontrado.</Empty> : contracts.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <div className="font-semibold text-horus-900">{c.plan.name}</div>
              <div className="text-slate-500">Até {c.plan.cameraLimit} câmeras · {c.plan.retentionDays} dias de gravação · vencimento todo dia {c.dueDay}</div>
            </div>
            <div className="flex items-center gap-3"><strong>{brl(c.monthlyValue)}/mês</strong><Badge value={c.status}>{label(CONTRACT_STATUS, c.status)}</Badge></div>
          </div>
        ))}
      </Card>
      <Card title="Faturas">
        {invoices.length === 0 ? <Empty>Nenhuma fatura.</Empty> : (
          <table className="table">
            <thead><tr><th>Referência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pago em</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.reference}</td><td>{date(i.dueDate)}</td><td>{brl(i.amount)}</td>
                  <td><Badge value={i.status}>{label(INVOICE_STATUS, i.status)}</Badge></td><td>{date(i.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
