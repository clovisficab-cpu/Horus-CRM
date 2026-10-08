import type { ServiceOrder } from "@prisma/client";
import { SERVICE_ORDER_STATUS, SERVICE_ORDER_TYPES } from "@/lib/constants";
import { toInputDateTime } from "@/lib/format";
import { Field, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";

type Opt = { id: string; name: string };

export default function OrderForm({ action, order, customers, technicians }: { action: (fd: FormData) => Promise<void>; order?: Partial<ServiceOrder>; customers: Opt[]; technicians: Opt[] }) {
  const o = order ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {o.id && <input type="hidden" name="id" value={o.id} />}
      {o.ticketId && <input type="hidden" name="ticketId" value={o.ticketId} />}
      <Field label="Cliente *"><Select name="customerId" required options={customers.map((c) => [c.id, c.name] as [string, string])} defaultValue={o.customerId} /></Field>
      <Field label="Tipo"><Select name="type" options={SERVICE_ORDER_TYPES} defaultValue={o.type ?? "MAINTENANCE"} /></Field>
      <Field label="Data e hora *"><input type="datetime-local" name="scheduledAt" required defaultValue={toInputDateTime(o.scheduledAt ?? null)} className="input" /></Field>
      <Field label="Técnico"><Select name="technicianId" options={technicians.map((t) => [t.id, t.name] as [string, string])} defaultValue={o.technicianId} includeEmpty="— a definir —" /></Field>
      <Field label="Status"><Select name="status" options={SERVICE_ORDER_STATUS} defaultValue={o.status ?? "SCHEDULED"} /></Field>
      <Field label="Endereço (vazio = do cliente)"><input name="address" defaultValue={o.address ?? ""} className="input" /></Field>
      <Field label="Instruções" className="sm:col-span-2"><textarea name="notes" rows={3} defaultValue={o.notes ?? ""} className="input" /></Field>
      {o.id && <Field label="Relatório do técnico" className="sm:col-span-2"><textarea name="report" rows={4} defaultValue={o.report ?? ""} className="input" /></Field>}
      <div><SubmitButton>Salvar</SubmitButton></div>
    </form>
  );
}
