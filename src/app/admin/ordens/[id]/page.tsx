import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ticketCode } from "@/lib/format";
import { SERVICE_ORDER_TYPES, label } from "@/lib/constants";
import { Card, PageHeader } from "@/components/ui";
import OrderForm from "../OrderForm";
import { updateOrderAction } from "../actions";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { customer: true, ticket: true } });
  if (!order) notFound();
  const [customers, technicians] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: { in: ["TECH", "ADMIN"] }, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`OS · ${label(SERVICE_ORDER_TYPES, order.type)}`}
        subtitle={
          <>
            {order.customer.name} · {order.customer.phone}
            {order.ticket && <> · chamado <Link href={`/admin/chamados/${order.ticket.id}`} className="text-gold-600 hover:underline">{ticketCode(order.ticket.number)}</Link></>}
          </>
        }
        actions={order.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`} target="_blank" rel="noreferrer" className="btn-outline">📍 Abrir no mapa</a>}
      />
      <Card><OrderForm action={updateOrderAction} order={order} customers={customers} technicians={technicians} /></Card>
    </div>
  );
}
