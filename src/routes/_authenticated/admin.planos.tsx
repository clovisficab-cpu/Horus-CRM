import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Empty, Field, PageHeader, Pill, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/planos")({ head: () => equipeHead("Planos", "Área de planos de videomonitoramento da Horus."), component: P });

type Plano = Tables<"planos">;

function P() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Plano | "novo" | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["admin", "planos"],
    queryFn: async () => (await supabase.from("planos").select("*").order("mensalidade")).data ?? [],
  });
  if (!isAdmin) return <Empty>Apenas administradores.</Empty>;

  return (
    <>
      <PageHeader title="Planos" actions={<Button variant="hero" onClick={() => setEdit("novo")}><Plus /> Novo plano</Button>} />
      {data.length === 0 ? <Empty>Nenhum plano.</Empty> : (
        <div className="grid gap-4 md:grid-cols-3">
          {data.map((p) => (
            <button key={p.id} onClick={() => setEdit(p)} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50">
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{p.nome}</span>
                <span className="flex gap-1">{p.destaque && <Pill tone="gold">Destaque</Pill>}{p.ativo ? <Pill tone="success">Ativo</Pill> : <Pill>Inativo</Pill>}</span></div>
              <div className="mt-2 text-2xl font-bold text-primary">{brl(p.mensalidade)}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.limite_cameras} câmeras · {p.dias_gravacao} dias de gravação</div>
            </button>
          ))}
        </div>
      )}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit === "novo" ? "Novo plano" : "Editar plano"}</DialogTitle></DialogHeader>
          {edit && <PlanoForm plano={edit === "novo" ? undefined : edit} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["admin", "planos"] }); qc.invalidateQueries({ queryKey: ["public", "planos"] }); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlanoForm({ plano: p, onSaved }: { plano?: Plano | undefined; onSaved: () => void }) {
  const [f, setF] = useState({
    nome: p?.nome ?? "", descricao: p?.descricao ?? "", mensalidade: p?.mensalidade?.toString() ?? "",
    limite_cameras: p?.limite_cameras?.toString() ?? "4", dias_gravacao: p?.dias_gravacao?.toString() ?? "7",
    recursos: (p?.recursos ?? []).join("\n"), destaque: p?.destaque ?? false, ativo: p?.ativo ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      nome: f.nome.trim(), descricao: f.descricao || null, mensalidade: Number(f.mensalidade.replace(",", ".")) || 0,
      limite_cameras: Number(f.limite_cameras) || 0, dias_gravacao: Number(f.dias_gravacao) || 0,
      recursos: f.recursos.split("\n").map((r) => r.trim()).filter(Boolean), destaque: f.destaque, ativo: f.ativo,
    };
    setLoading(true);
    const { error } = p ? await supabase.from("planos").update(payload).eq("id", p.id) : await supabase.from("planos").insert(payload);
    setLoading(false);
    if (error) return void toast.error(error.message);
    toast.success("Plano salvo");
    onSaved();
  }

  return (
    <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome *" className="sm:col-span-2"><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></Field>
      <Field label="Descrição" className="sm:col-span-2"><Textarea value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
      <Field label="Mensalidade (R$)"><Input inputMode="decimal" value={f.mensalidade} onChange={(e) => setF({ ...f, mensalidade: e.target.value })} required /></Field>
      <Field label="Limite de câmeras"><Input type="number" value={f.limite_cameras} onChange={(e) => setF({ ...f, limite_cameras: e.target.value })} /></Field>
      <Field label="Dias de gravação"><Input type="number" value={f.dias_gravacao} onChange={(e) => setF({ ...f, dias_gravacao: e.target.value })} /></Field>
      <Field label="Destaque">
        <select className={selectCls} value={f.destaque ? "1" : "0"} onChange={(e) => setF({ ...f, destaque: e.target.value === "1" })}><option value="0">Não</option><option value="1">Sim</option></select>
      </Field>
      <Field label="Ativo">
        <select className={selectCls} value={f.ativo ? "1" : "0"} onChange={(e) => setF({ ...f, ativo: e.target.value === "1" })}><option value="1">Sim</option><option value="0">Não</option></select>
      </Field>
      <Field label="Recursos (um por linha)" className="sm:col-span-2"><Textarea rows={5} value={f.recursos} onChange={(e) => setF({ ...f, recursos: e.target.value })} /></Field>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="hero" disabled={loading}>{loading ? "Salvando..." : "Salvar plano"}</Button></div>
    </form>
  );
}
