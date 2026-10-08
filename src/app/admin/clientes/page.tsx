import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl } from "@/lib/format";
import { CUSTOMER_STATUS, label } from "@/lib/constants";
import { Badge, Empty, PageHeader, Select } from "@/components/ui";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  await requireStaff(["ADMIN", "AGENT"]);
  const where: Prisma.CustomerWhereInput = {};
  if (sp.status) where.status = sp.status;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { document: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q, mode: "insensitive" } }, { city: { contains: sp.q, mode: "insensitive" } }];

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      contracts: { where: { status: "ACTIVE" }, select: { monthlyValue: true } },
      _count: { select: { cameras: true, tickets: { where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } } } } },
    },
  });

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${customers.length} cliente(s)`} actions={<Link href="/admin/clientes/novo" className="btn-gold">Novo cliente</Link>} />
      <form className="card mb-4 flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nome, documento, e-mail, telefone, cidade" className="input max-w-md" />
        <div className="w-48"><Select name="status" options={CUSTOMER_STATUS} defaultValue={sp.status} includeEmpty="Todos os status" /></div>
        <button className="btn-primary">Filtrar</button>
      </form>
      {customers.length === 0 ? <Empty>Nenhum cliente encontrado.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Contato</th><th>Cidade</th><th>Câmeras</th><th>Chamados ativos</th><th>Mensalidade</th><th>Status</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/clientes/${c.id}`} className="font-medium text-horus-900 hover:text-gold-600">{c.name}</Link><div className="text-xs text-slate-500">{c.document}</div></td>
                  <td className="text-xs">{c.phone}<br />{c.email}</td>
                  <td>{c.city}{c.state && `/${c.state}`}</td>
                  <td>{c._count.cameras}</td>
                  <td>{c._count.tickets > 0 ? <Badge tone="blue">{c._count.tickets}</Badge> : "—"}</td>
                  <td>{brl(c.contracts.reduce((s, x) => s + x.monthlyValue, 0))}</td>
                  <td><Badge value={c.status}>{label(CUSTOMER_STATUS, c.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
