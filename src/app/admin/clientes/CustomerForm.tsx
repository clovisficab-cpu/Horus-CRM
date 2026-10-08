import { CUSTOMER_STATUS } from "@/lib/constants";
import { Field, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import type { Customer } from "@prisma/client";

type Defaults = Partial<Pick<Customer, "name" | "type" | "document" | "email" | "phone" | "whatsapp" | "address" | "city" | "state" | "status" | "notes">>;

export default function CustomerForm({ action, customer, hidden }: { action: (fd: FormData) => Promise<void>; customer?: Defaults & { id?: string }; hidden?: Record<string, string> }) {
  const c = customer ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Field label="Nome / Razão social *" className="sm:col-span-2"><input name="name" required defaultValue={c.name ?? ""} className="input" /></Field>
      <Field label="Tipo"><Select name="type" options={{ PJ: "Pessoa jurídica", PF: "Pessoa física" }} defaultValue={c.type ?? "PJ"} /></Field>
      <Field label="CPF / CNPJ"><input name="document" defaultValue={c.document ?? ""} className="input" /></Field>
      <Field label="E-mail"><input name="email" type="email" defaultValue={c.email ?? ""} className="input" /></Field>
      <Field label="Telefone"><input name="phone" defaultValue={c.phone ?? ""} className="input" /></Field>
      <Field label="WhatsApp"><input name="whatsapp" defaultValue={c.whatsapp ?? ""} placeholder="usado para identificar no bot" className="input" /></Field>
      <Field label="Status"><Select name="status" options={CUSTOMER_STATUS} defaultValue={c.status ?? "ACTIVE"} /></Field>
      <Field label="Endereço" className="sm:col-span-2"><input name="address" defaultValue={c.address ?? ""} className="input" /></Field>
      <Field label="Cidade"><input name="city" defaultValue={c.city ?? ""} className="input" /></Field>
      <Field label="UF"><input name="state" maxLength={2} defaultValue={c.state ?? ""} className="input" /></Field>
      <Field label="Observações" className="sm:col-span-2 lg:col-span-4"><textarea name="notes" rows={2} defaultValue={c.notes ?? ""} className="input" /></Field>
      <div className="sm:col-span-2 lg:col-span-4"><SubmitButton>Salvar</SubmitButton></div>
    </form>
  );
}
