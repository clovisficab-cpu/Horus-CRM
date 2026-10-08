import type { Lead, User } from "@prisma/client";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/constants";
import { Field, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";

export default function LeadForm({ action, lead, staff }: { action: (fd: FormData) => Promise<void>; lead?: Partial<Lead>; staff: User[] }) {
  const l = lead ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {l.id && <input type="hidden" name="id" value={l.id} />}
      <Field label="Nome *"><input name="name" required defaultValue={l.name ?? ""} className="input" /></Field>
      <Field label="Empresa / condomínio"><input name="company" defaultValue={l.company ?? ""} className="input" /></Field>
      <Field label="Tipo de local / interesse"><input name="interest" defaultValue={l.interest ?? ""} className="input" /></Field>
      <Field label="Telefone"><input name="phone" defaultValue={l.phone ?? ""} className="input" /></Field>
      <Field label="E-mail"><input name="email" type="email" defaultValue={l.email ?? ""} className="input" /></Field>
      <Field label="Valor mensal estimado (R$)"><input name="value" type="number" step="0.01" defaultValue={l.value ?? ""} className="input" /></Field>
      <Field label="Origem"><Select name="source" options={LEAD_SOURCES} defaultValue={l.source ?? "OUTRO"} /></Field>
      <Field label="Etapa"><Select name="stage" options={LEAD_STAGES} defaultValue={l.stage ?? "NEW"} /></Field>
      <Field label="Responsável"><Select name="ownerId" options={staff.map((u) => [u.id, u.name] as [string, string])} defaultValue={l.ownerId} includeEmpty="—" /></Field>
      <Field label="Observações" className="sm:col-span-2 lg:col-span-3"><textarea name="notes" rows={3} defaultValue={l.notes ?? ""} className="input" /></Field>
      <div><SubmitButton>Salvar</SubmitButton></div>
    </form>
  );
}
