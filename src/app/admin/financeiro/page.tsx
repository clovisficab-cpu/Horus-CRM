import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl, date } from "@/lib/format";
import { CONTRACT_STATUS, INVOICE_STATUS, label } from "@/lib/constants";
import { Badge, Card, Empty, PageHeader, Select, Stat } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { generateInvoicesAction, refreshOverdueAction, setContractStatusAction, setInvoiceStatusAction } from "./actions";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ status?: string; ref?: string }> }) {
  const sp = await searchParams;
  await requireStaff(["ADMIN", "AGENT"]);
  const currentRef = new Date().toISOString().slice(0, 7);
  const [invoices, contracts, totals] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...(sp.status ? { status: sp.status } : {}), ...(sp.ref ? { reference: sp.ref } : {}) },
      orderBy: { dueDate: "desc" },
      take: 200,
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.contract.findMany({ orderBy: { startDate: "desc" }, include: { customer: true, plan: true } }),
    prisma.invoice.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
  ]);
  const sum = (s: string) => totals.find((t) => t.status === s)?._sum.amount ?? 0;
  const mrr = contracts.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + c.monthlyValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Contratos, faturamento e inadimplência" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="MRR" value={brl(mrr)} />
        <Stat label="Em aberto" value={brl(sum("OPEN"))} href="/admin/financeiro?status=OPEN" />
        <Stat label="Vencido" value={brl(sum("OVERDUE"))} tone="danger" href="/admin/financeiro?status=OVERDUE" />
        <Stat label="Recebido (total)" value={brl(sum("PAID"))} tone="ok" href="/admin/financeiro?status=PAID" />
      </div>

      <Card
        title="Faturas"
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={generateInvoicesAction} className="flex gap-2">
              <input name="reference" type="month" defaultValue={currentRef} className="input w-auto py-1" />
              <SubmitButton className="btn-outline" pendingText="Gerando...">Gerar faturas do mês</SubmitButton>
            </form>
            <form action={refreshOverdueAction}><SubmitButton className="btn-outline" pendingText="...">Atualizar vencidas</SubmitButton></form>
          </div>
        }
      >
        <form className="mb-4 flex flex-wrap gap-2">
          <div className="w-44"><Select name="status" options={INVOICE_STATUS} defaultValue={sp.status} includeEmpty="Todos os status" /></div>
          <input name="ref" type="month" defaultValue={sp.ref} className="input w-auto" />
          <button className="btn-primary">Filtrar</button>
        </form>
        {invoices.length === 0 ? <Empty>Nenhuma fatura.</Empty> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Cliente</th><th>Ref.</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pago em</th><th></th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td><Link href={`/admin/clientes/${i.customer.id}`} className="hover:text-gold-600">{i.customer.name}</Link></td>
                    <td>{i.reference}</td>
                    <td>{date(i.dueDate)}</td>
                    <td>{brl(i.amount)}</td>
                    <td><Badge value={i.status}>{label(INVOICE_STATUS, i.status)}</Badge></td>
                    <td>{date(i.paidAt)}</td>
                    <td>
                      <form action={setInvoiceStatusAction} className="flex gap-1">
                        <input type="hidden" name="id" value={i.id} />
                        {i.status !== "PAID" && <button name="status" value="PAID" className="text-xs text-emerald-700 hover:underline">baixar</button>}
                        {i.status === "PAID" && <button name="status" value="OPEN" className="text-xs text-slate-500 hover:underline">estornar</button>}
                        {i.status !== "CANCELLED" && i.status !== "PAID" && <button name="status" value="CANCELLED" className="ml-2 text-xs text-red-600 hover:underline">cancelar</button>}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Contratos">
        {contracts.length === 0 ? <Empty>Nenhum contrato.</Empty> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Cliente</th><th>Plano</th><th>Valor</th><th>Venc.</th><th>Início</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/clientes/${c.customerId}`} className="hover:text-gold-600">{c.customer.name}</Link></td>
                    <td>{c.plan.name}</td>
                    <td>{brl(c.monthlyValue)}</td>
                    <td>dia {c.dueDay}</td>
                    <td>{date(c.startDate)}</td>
                    <td><Badge value={c.status}>{label(CONTRACT_STATUS, c.status)}</Badge></td>
                    <td>
                      <form action={setContractStatusAction} className="flex gap-2 text-xs">
                        <input type="hidden" name="id" value={c.id} />
                        {c.status !== "ACTIVE" && <button name="status" value="ACTIVE" className="text-emerald-700 hover:underline">reativar</button>}
                        {c.status === "ACTIVE" && <button name="status" value="SUSPENDED" className="text-amber-700 hover:underline">suspender</button>}
                        {c.status !== "CANCELLED" && <button name="status" value="CANCELLED" className="text-red-600 hover:underline">cancelar</button>}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
