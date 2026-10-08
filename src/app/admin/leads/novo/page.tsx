import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import LeadForm from "../LeadForm";
import { createLeadAction } from "../actions";

export default async function NewLead({ searchParams }: { searchParams: Promise<{ name?: string; phone?: string; source?: string }> }) {
  const sp = await searchParams;
  await requireStaff(["ADMIN", "AGENT"]);
  const staff = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "AGENT"] }, active: true } });
  return (
    <div>
      <PageHeader title="Novo lead" />
      <Card><LeadForm action={createLeadAction} staff={staff} lead={{ name: sp.name, phone: sp.phone, source: sp.source }} /></Card>
    </div>
  );
}
