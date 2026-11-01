import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Field, selectCls } from "./kit";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function ClienteForm({ cliente, onSaved }: { cliente?: Tables<"clientes">; onSaved: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!f["nome"]?.trim()) return void toast.error("Informe o nome");
    const payload = {
      nome: f["nome"].trim(),
      tipo: f["tipo"] ?? "PF",
      documento: f["documento"] || null,
      email: f["email"] || null,
      telefone: f["telefone"] || null,
      whatsapp: f["whatsapp"] || null,
      endereco: f["endereco"] || null,
      cidade: f["cidade"] || null,
      uf: (f["uf"] || "").toUpperCase().slice(0, 2) || null,
      status: f["status"] ?? "ativo",
      observacoes: f["observacoes"] || null,
    };
    setLoading(true);
    const res = cliente
      ? await supabase.from("clientes").update(payload).eq("id", cliente.id).select("id").single()
      : await supabase.from("clientes").insert(payload).select("id").single();
    setLoading(false);
    if (res.error) return void toast.error(res.error.message);
    toast.success("Cliente salvo");
    onSaved(res.data.id);
  }
  const c = cliente;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome / Razão social *" className="sm:col-span-2"><Input name="nome" defaultValue={c?.nome} required /></Field>
      <Field label="Tipo">
        <select name="tipo" defaultValue={c?.tipo ?? "PF"} className={selectCls}><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select>
      </Field>
      <Field label="CPF / CNPJ"><Input name="documento" defaultValue={c?.documento ?? ""} /></Field>
      <Field label="E-mail"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
      <Field label="Telefone"><Input name="telefone" defaultValue={c?.telefone ?? ""} /></Field>
      <Field label="WhatsApp"><Input name="whatsapp" defaultValue={c?.whatsapp ?? ""} /></Field>
      <Field label="Status">
        <select name="status" defaultValue={c?.status ?? "ativo"} className={selectCls}>
          <option value="ativo">Ativo</option><option value="suspenso">Suspenso</option><option value="inativo">Inativo</option>
        </select>
      </Field>
      <Field label="Endereço" className="sm:col-span-2"><Input name="endereco" defaultValue={c?.endereco ?? ""} /></Field>
      <Field label="Cidade"><Input name="cidade" defaultValue={c?.cidade ?? ""} /></Field>
      <Field label="UF"><Input name="uf" maxLength={2} defaultValue={c?.uf ?? ""} /></Field>
      <Field label="Observações" className="sm:col-span-2"><Textarea name="observacoes" rows={3} defaultValue={c?.observacoes ?? ""} /></Field>
      <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="hero" disabled={loading}>{loading ? "Salvando..." : "Salvar cliente"}</Button></div>
    </form>
  );
}
