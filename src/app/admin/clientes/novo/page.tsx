import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import CustomerForm from "../CustomerForm";
import { createCustomerAction } from "../actions";

export default async function NewCustomer({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const sp = await searchParams;
  await requireStaff(["ADMIN", "AGENT"]);
  const lead = sp.lead ? await prisma.lead.findUnique({ where: { id: sp.lead } }) : null;
  return (
    <div>
      <PageHeader title="Novo cliente" subtitle={lead ? `Convertendo o lead "${lead.name}"` : undefined} />
      <Card>
        <CustomerForm
          action={createCustomerAction}
          customer={lead ? { name: lead.company || lead.name, email: lead.email, phone: lead.phone, notes: lead.notes } : undefined}
          hidden={lead ? { leadId: lead.id } : undefined}
        />
      </Card>
    </div>
  );
}
