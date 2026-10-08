import type { Plan } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl } from "@/lib/format";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { savePlanAction } from "./actions";

function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <form action={savePlanAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <Field label="Nome"><input name="name" required defaultValue={plan?.name} className="input" /></Field>
      <Field label="Mensalidade (R$)"><input name="monthlyPrice" type="number" step="0.01" required defaultValue={plan?.monthlyPrice} className="input" /></Field>
      <Field label="Limite de câmeras"><input name="cameraLimit" type="number" defaultValue={plan?.cameraLimit ?? 4} className="input" /></Field>
      <Field label="Dias de gravação"><input name="retentionDays" type="number" defaultValue={plan?.retentionDays ?? 7} className="input" /></Field>
      <Field label="Descrição" className="sm:col-span-2"><input name="description" defaultValue={plan?.description ?? ""} className="input" /></Field>
      <Field label="Recursos (um por linha)" className="sm:col-span-2"><textarea name="features" rows={3} defaultValue={plan?.features ?? ""} className="input" /></Field>
      <div className="flex items-center gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={plan?.active ?? true} /> Ativo</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={plan?.featured ?? false} /> Destaque no site</label>
      </div>
      <div className="sm:col-span-2 sm:text-right"><SubmitButton>{plan ? "Salvar" : "Criar plano"}</SubmitButton></div>
    </form>
  );
}

export default async function PlansAdmin() {
  await requireStaff(["ADMIN"]);
  const plans = await prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" }, include: { _count: { select: { contracts: true } } } });
  return (
    <div className="space-y-6">
      <PageHeader title="Planos" subtitle="Exibidos no site e usados nos contratos" />
      {plans.map((p) => (
        <Card key={p.id} title={<span className="flex items-center gap-2">{p.name} · {brl(p.monthlyPrice)} {!p.active && <Badge>inativo</Badge>} {p.featured && <Badge tone="gold">destaque</Badge>}</span>} actions={<span className="text-xs text-slate-500">{p._count.contracts} contrato(s)</span>}>
          <PlanForm plan={p} />
        </Card>
      ))}
      <Card title="Novo plano"><PlanForm /></Card>
    </div>
  );
}
