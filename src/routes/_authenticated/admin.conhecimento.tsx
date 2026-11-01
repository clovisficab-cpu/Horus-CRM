import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Empty, Field, PageHeader, Pill, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIAS } from "@/lib/chamados";
import { equipeHead } from "@/lib/page-head";

const conhecimentoQuery = (userId: string) => queryOptions({ queryKey: ["admin", userId, "conhecimento"], queryFn: async () => {
  const { data, error } = await supabase.from("base_conhecimento").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
} });

export const Route = createFileRoute("/_authenticated/admin/conhecimento")({
  head: () => equipeHead("Base de conhecimento", "Perguntas e respostas para o atendimento dos clientes Horus."),
  loader: ({ context }) => context.queryClient.ensureQueryData(conhecimentoQuery(context.user.id)),
  component: Conhecimento,
});
type Artigo = Tables<"base_conhecimento">;

function Conhecimento() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(conhecimentoQuery(user.id));
  const [edit, setEdit] = useState<Artigo | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin", user.id, "conhecimento"] });
  async function excluir(a: Artigo) {
    if (!window.confirm(`Excluir “${a.pergunta}”?`)) return;
    setExcluindo(a.id);
    try {
      const { error } = await supabase.from("base_conhecimento").delete().eq("id", a.id);
      if (error) throw error;
      toast.success("Pergunta excluída."); recarregar();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir."); }
    finally { setExcluindo(null); }
  }
  return <>
    <PageHeader title="Base de conhecimento" actions={<Button onClick={() => setEdit("novo")}><Plus />Nova pergunta</Button>} />
    {!data.length ? <Empty>Nenhuma pergunta cadastrada.</Empty> : <div className="divide-y divide-border">{data.map((a) => <article key={a.id} className="py-5">
      <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{a.pergunta}</h2><div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" title="Editar pergunta" aria-label="Editar pergunta" onClick={() => setEdit(a)}><Pencil /></Button>
        <Button variant="ghost" size="icon" title="Excluir pergunta" aria-label="Excluir pergunta" disabled={excluindo === a.id} onClick={() => excluir(a)}><Trash2 /></Button>
      </div></div>
      <p className="my-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{a.resposta}</p>
      <div className="flex gap-2"><Pill>{CATEGORIAS[a.categoria] ?? a.categoria}</Pill><Pill tone={a.publicada ? "success" : "muted"}>{a.publicada ? "Publicada" : "Não publicada"}</Pill></div>
    </article>)}</div>}
    <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{edit === "novo" ? "Nova pergunta" : "Editar pergunta"}</DialogTitle></DialogHeader>
      {edit && <Formulario artigo={edit === "novo" ? null : edit} onSaved={() => { setEdit(null); recarregar(); }} />}
    </DialogContent></Dialog>
  </>;
}

function Formulario({ artigo, onSaved }: { artigo: Artigo | null; onSaved: () => void }) {
  const [f, setF] = useState({ pergunta: artigo?.pergunta ?? "", resposta: artigo?.resposta ?? "", categoria: artigo?.categoria ?? "outros", publicada: artigo?.publicada ?? true });
  const [salvando, setSalvando] = useState(false);
  async function salvar(e: FormEvent) {
    e.preventDefault();
    const payload = { ...f, pergunta: f.pergunta.trim(), resposta: f.resposta.trim() };
    if (!payload.pergunta || !payload.resposta) return void toast.error("Informe pergunta e resposta.");
    setSalvando(true);
    try {
      const { error } = artigo ? await supabase.from("base_conhecimento").update(payload).eq("id", artigo.id) : await supabase.from("base_conhecimento").insert(payload);
      if (error) throw error;
      toast.success("Pergunta salva."); onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }
  return <form onSubmit={salvar} className="space-y-4">
    <Field label="Pergunta"><Input required maxLength={300} value={f.pergunta} onChange={(e) => setF({ ...f, pergunta: e.target.value })} /></Field>
    <Field label="Resposta"><Textarea required rows={6} maxLength={4000} value={f.resposta} onChange={(e) => setF({ ...f, resposta: e.target.value })} /></Field>
    <Field label="Categoria"><select className={selectCls} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{Object.entries(CATEGORIAS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.publicada} onChange={(e) => setF({ ...f, publicada: e.target.checked })} />Publicada</label>
    <div className="flex justify-end"><Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar pergunta"}</Button></div>
  </form>;
}