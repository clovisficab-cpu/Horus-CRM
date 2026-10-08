import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { ACTIVITY_TYPES, LEAD_STAGES, label } from "@/lib/constants";
import { Badge, Card, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import LeadForm from "../LeadForm";
import { deleteLeadAction, updateLeadAction } from "../actions";
import { addActivityAction } from "../../clientes/actions";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(["ADMIN", "AGENT"]);
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { customer: true, activities: { orderBy: { createdAt: "desc" }, include: { user: true } } },
  });
  if (!lead) notFound();
  const staff = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "AGENT"] }, active: true } });
  const wa = lead.phone?.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.name}
        subtitle={lead.company}
        actions={
          <>
            <Badge value={lead.stage}>{label(LEAD_STAGES, lead.stage)}</Badge>
            {wa && <a href={`https://wa.me/${wa.length <= 11 ? "55" + wa : wa}`} target="_blank" rel="noreferrer" className="btn-outline">💬 WhatsApp</a>}
            {lead.customer ? (
              <Link href={`/admin/clientes/${lead.customer.id}`} className="btn-outline">Ver cliente</Link>
            ) : (
              <Link href={`/admin/clientes/novo?lead=${lead.id}`} className="btn-gold">Converter em cliente</Link>
            )}
          </>
        }
      />
      <Card><LeadForm action={updateLeadAction} lead={lead} staff={staff} /></Card>
      <Card title="Interações">
        <form action={addActivityAction} className="mb-5 flex flex-wrap gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="w-40"><Select name="type" options={ACTIVITY_TYPES} defaultValue="CALL" /></div>
          <input name="description" required placeholder="Ex.: Liguei, agendada visita técnica para sexta" className="input flex-1" />
          <SubmitButton>Registrar</SubmitButton>
        </form>
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
          {lead.activities.map((a) => (
            <li key={a.id} className="text-sm">
              <div className="text-xs text-slate-500">{dateTime(a.createdAt)} · {label(ACTIVITY_TYPES, a.type)} · {a.user?.name ?? "sistema"}</div>
              <div>{a.description}</div>
            </li>
          ))}
        </ol>
      </Card>
      <form action={deleteLeadAction}>
        <input type="hidden" name="id" value={lead.id} />
        <ConfirmButton message="Excluir este lead?">Excluir lead</ConfirmButton>
      </form>
    </div>
  );
}
