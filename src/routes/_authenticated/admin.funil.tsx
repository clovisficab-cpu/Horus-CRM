import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Field, PageHeader, Pill, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { brl, dataHoraBR, ETAPAS, ORIGENS } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/funil")({ head: () => equipeHead("Funil de vendas", "Área de oportunidades comerciais da equipe Horus."), component: P });

type Lead = Tables<"leads">;
const ids = ETAPAS.map((e) => e.id as string);

function P() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Lead | "novo" | null>(null);
  const { data: leads = [] } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: async () => (await supabase.from("leads").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin", "leads"] });

  async function mover(l: Lead, d: number) {
    const etapa = ids[ids.indexOf(l.etapa) + d];
    if (!etapa) return;
    const { error } = await supabase.from("leads").update({ etapa }).eq("id", l.id);
    if (error) return void toast.error(error.message);
    recarregar();
  }

  return (
    <>
      <PageHeader title="Funil de vendas" subtitle={`${leads.length} leads`} actions={<Button variant="hero" onClick={() => setEdit("novo")}><Plus /> Novo lead</Button>} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((e) => {
          const col = leads.filter((l) => l.etapa === e.id);
          const total = col.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0);
          return (
            <div key={e.id} className="w-64 shrink-0 rounded-xl border border-border bg-card/50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{e.label}</span><Pill>{col.length}</Pill>
              </div>
              <div className="mb-3 text-xs text-muted-foreground">{brl(total)}/mês</div>
              <div className="space-y-2">
                {col.map((l) => (
                  <div key={l.id} className="cursor-pointer rounded-lg border border-border bg-card p-3 hover:border-primary/50" onClick={() => setEdit(l)}>
                    <div className="font-medium">{l.nome}</div>
                    {l.empresa && <div className="text-xs text-muted-foreground">{l.empresa}</div>}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <Pill tone="gold">{ORIGENS[l.origem] ?? l.origem}</Pill>
                      <span>{l.valor_estimado ? brl(l.valor_estimado) : "—"}</span>
                    </div>
                    <div className="mt-2 flex justify-between" onClick={(ev) => ev.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={e.id === ids[0]} onClick={() => mover(l, -1)} aria-label="Voltar etapa"><ChevronLeft /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={e.id === ids[ids.length - 1]} onClick={() => mover(l, 1)} aria-label="Avançar etapa"><ChevronRight /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit === "novo" ? "Novo lead" : "Ficha do lead"}</DialogTitle></DialogHeader>
          {edit && <LeadFicha key={edit === "novo" ? "novo" : edit.id} lead={edit === "novo" ? undefined : edit} onSaved={() => { setEdit(null); recarregar(); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeadFicha({ lead: l, onSaved }: { lead?: Lead | undefined; onSaved: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({
    nome: l?.nome ?? "", empresa: l?.empresa ?? "", telefone: l?.telefone ?? "", email: l?.email ?? "",
    origem: l?.origem ?? "telefone", etapa: l?.etapa ?? "novo", interesse: l?.interesse ?? "",
    valor_estimado: l?.valor_estimado?.toString() ?? "", observacoes: l?.observacoes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState("ligacao");
  const [desc, setDesc] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const { data: ativs = [] } = useQuery({
    queryKey: ["admin", "atividades-lead", l?.id],
    enabled: !!l,
    queryFn: async () => (await supabase.from("atividades").select("*").eq("lead_id", l!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return void toast.error("Informe o nome");
    const payload = {
      nome: f.nome.trim(), empresa: f.empresa || null, telefone: f.telefone || null, email: f.email || null,
      origem: f.origem, etapa: f.etapa, interesse: f.interesse || null,
      valor_estimado: f.valor_estimado ? Number(f.valor_estimado.replace(",", ".")) : null, observacoes: f.observacoes || null,
    };
    setLoading(true);
    const { error } = l ? await supabase.from("leads").update(payload).eq("id", l.id) : await supabase.from("leads").insert(payload);
    setLoading(false);
    if (error) return void toast.error(error.message);
    toast.success("Lead salvo");
    onSaved();
  }

  async function registrar() {
    if (!l || !desc.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("atividades").insert({ lead_id: l.id, tipo, descricao: desc.trim(), autor: u.user?.id ?? null });
    if (error) return void toast.error(error.message);
    setDesc("");
    qc.invalidateQueries({ queryKey: ["admin", "atividades-lead", l.id] });
  }

  async function converter() {
    if (!l) return;
    setLoading(true);
    const { data: cli, error } = await supabase.from("clientes").insert({
      nome: f.empresa || f.nome, tipo: f.empresa ? "PJ" : "PF", email: f.email || null, telefone: f.telefone || null,
      whatsapp: f.telefone || null, observacoes: [f.interesse, f.observacoes].filter(Boolean).join("\n") || null,
    }).select("id").single();
    if (error || !cli) { setLoading(false); return void toast.error(error?.message ?? "Falha ao criar cliente"); }
    await supabase.from("leads").update({ etapa: "ganho", cliente_id: cli.id }).eq("id", l.id);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("atividades").insert({ cliente_id: cli.id, lead_id: l.id, tipo: "sistema", descricao: "Cliente criado a partir do lead", autor: u.user?.id ?? null });
    qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    toast.success("Cliente criado");
    navigate({ to: "/admin/clientes/$id", params: { id: cli.id } });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *"><Input value={f.nome} onChange={set("nome")} required /></Field>
        <Field label="Empresa"><Input value={f.empresa} onChange={set("empresa")} /></Field>
        <Field label="Telefone"><Input value={f.telefone} onChange={set("telefone")} /></Field>
        <Field label="E-mail"><Input type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="Origem">
          <select className={selectCls} value={f.origem} onChange={set("origem")}>
            {Object.entries(ORIGENS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Etapa">
          <select className={selectCls} value={f.etapa} onChange={set("etapa")}>
            {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </Field>
        <Field label="Interesse"><Input value={f.interesse} onChange={set("interesse")} /></Field>
        <Field label="Valor mensal estimado (R$)"><Input inputMode="decimal" value={f.valor_estimado} onChange={set("valor_estimado")} /></Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea value={f.observacoes} onChange={set("observacoes")} /></Field>
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          {l && !l.cliente_id && <Button type="button" variant="outline" disabled={loading} onClick={converter}>Converter em cliente</Button>}
          <Button type="submit" variant="hero" disabled={loading}>{loading ? "Salvando..." : "Salvar lead"}</Button>
        </div>
      </form>
      {l && (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="font-semibold">Interações</h3>
          <div className="flex flex-wrap gap-2">
            <select className={`${selectCls} w-36`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="ligacao">Ligação</option><option value="visita">Visita</option><option value="anotacao">Anotação</option><option value="whatsapp">WhatsApp</option>
            </select>
            <Input className="flex-1" placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Button type="button" onClick={registrar}>Registrar</Button>
          </div>
          {ativs.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span className="uppercase">{a.tipo}</span><span>{dataHoraBR(a.created_at)}</span></div>
              {a.descricao}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
