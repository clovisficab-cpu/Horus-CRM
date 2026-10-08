import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import OrderForm from "../OrderForm";
import { createOrderAction } from "../actions";

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ customer?: string; ticket?: string }> }) {
  const sp = await searchParams;
  await requireStaff();
  const [customers, technicians] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: { in: ["TECH", "ADMIN"] }, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova ordem de serviço" />
      <Card>
        <OrderForm action={createOrderAction} customers={customers} technicians={technicians} order={{ customerId: sp.customer, ticketId: sp.ticket, scheduledAt: tomorrow }} />
      </Card>
    </div>
  );
}
