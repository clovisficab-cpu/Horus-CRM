import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { SERVICE_ORDER_STATUS, SERVICE_ORDER_TYPES, label } from "@/lib/constants";
import { Badge, Empty, PageHeader, Select } from "@/components/ui";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; tech?: string }> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const techFilter = sp.tech ?? (user.role === "TECH" ? user.id : "");
  const where: Prisma.ServiceOrderWhereInput = {
    status: sp.status ? sp.status : { in: ["SCHEDULED", "IN_PROGRESS"] },
    ...(techFilter ? { technicianId: techFilter } : {}),
  };
  const [orders, techs] = await Promise.all([
    prisma.serviceOrder.findMany({ where, orderBy: { scheduledAt: "asc" }, include: { customer: true, technician: true } }),
    prisma.user.findMany({ where: { role: { in: ["TECH", "ADMIN"] }, active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Ordens de serviço" subtitle="Agenda técnica: instalações, manutenções e vistorias" actions={<Link href="/admin/ordens/nova" className="btn-gold">Nova OS</Link>} />
      <form className="card mb-4 flex flex-wrap gap-3 p-4">
        <div className="w-48"><Select name="status" options={SERVICE_ORDER_STATUS} defaultValue={sp.status} includeEmpty="Pendentes" /></div>
        <div className="w-56"><Select name="tech" options={techs.map((t) => [t.id, t.name] as [string, string])} defaultValue={techFilter} includeEmpty="Todos os técnicos" /></div>
        <button className="btn-primary">Filtrar</button>
      </form>
      {orders.length === 0 ? <Empty>Nenhuma ordem de serviço.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Endereço</th><th>Técnico</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/ordens/${o.id}`} className="font-medium hover:text-gold-600">{dateTime(o.scheduledAt)}</Link></td>
                  <td>{o.customer.name}</td>
                  <td>{label(SERVICE_ORDER_TYPES, o.type)}</td>
                  <td className="text-xs">{o.address}</td>
                  <td>{o.technician?.name ?? "—"}</td>
                  <td><Badge value={o.status}>{label(SERVICE_ORDER_STATUS, o.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
