import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Check, MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { OrdemForm } from "@/components/OrdemForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, Field, PageHeader, Pill, errMsg, selectCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { listarResponsaveis } from "@/lib/admin.functions";
import { dataHoraBR } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";
import { relatorioSchema, STATUS_ORDEM, tecnicoPadrao, TIPOS_ORDEM } from "@/lib/ordens";

export const Route = createFileRoute("/_authenticated/admin/ordens")({ head: () => equipeHead("Ordens de serviço", "Agenda de instalações, manutenção e visitas técnicas Horus."), component: Ordens });

function Ordens() {
  const { user, papeis } = Route.useRouteContext();
  const qc = useQueryClient();
  const listar = useServerFn(listarResponsaveis);
  const [status, setStatus] = useState("");
  const [tecnico, setTecnico] = useState(() => tecnicoPadrao(papeis, user.id));
  const [form, setForm] = useState<Tables<"ordens_servico"> | "nova" | null>(null);
  const [concluir, setConcluir] = useState<Tables<"ordens_servico"> | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: equipe } = useQuery({ queryKey: ["admin", "responsaveis"], queryFn: () => listar() });
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "ordens", user.id, status, tecnico], queryFn: async () => {
    let q = supabase.from("ordens_servico").select("*, clientes(nome), chamados(protocolo)").order("agendada_em");
    if (status) q = q.eq("status", status);
    if (tecnico) q = q.eq("tecnico_id", tecnico);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } });
  async function finalizar(e: FormEvent) {
    e.preventDefault();
    if (!concluir) return;
    const validado = relatorioSchema.safeParse(relatorio);
    if (!validado.success) return void toast.error("Informe o relatório do técnico.");
    setLoading(true);
    try {
      const { data: alterada, error } = await supabase.from("ordens_servico").update({ status: "concluida", relatorio_tecnico: validado.data }).eq("id", concluir.id).in("status", ["agendada", "em_execucao"]).select("id").maybeSingle();
      if (error) throw error;
      if (!alterada) throw new Error("Esta ordem não está mais disponível para conclusão.");
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin", "ordens"] }), qc.invalidateQueries({ queryKey: ["admin", "dashboard"] }), qc.invalidateQueries({ queryKey: ["admin", "cliente", concluir.cliente_id] }), qc.invalidateQueries({ queryKey: ["admin", "chamado"] })]);
      setConcluir(null); toast.success("Ordem concluída e visita registrada.");
    } catch (err) { toast.error(errMsg(err)); } finally { setLoading(false); }
  }
  return <>
    <PageHeader title="Ordens de serviço" actions={<Button variant="hero" onClick={() => setForm("nova")}><Plus />Nova ordem</Button>} />
    <div className="mb-5 flex flex-wrap gap-3">
      <select aria-label="Filtrar por status" className={`${selectCls} w-48`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_ORDEM).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select aria-label="Filtrar por técnico" className={`${selectCls} w-60`} value={tecnico} onChange={(e) => setTecnico(e.target.value)}><option value="">Todos os técnicos</option>{equipe?.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
    </div>
    {isLoading ? <p className="text-muted-foreground">Carregando…</p> : isError ? <Empty>Não foi possível carregar as ordens.</Empty> : !data?.length ? <Empty>Nenhuma ordem de serviço encontrada.</Empty> : <div className="divide-y divide-border border-y border-border">{data.map((o) => <article key={o.id} className="flex flex-col justify-between gap-4 py-5 md:flex-row">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{o.clientes?.nome} · {TIPOS_ORDEM[o.tipo as keyof typeof TIPOS_ORDEM]}</h2><Pill tone={o.status === "concluida" ? "success" : o.status === "em_execucao" ? "warning" : "muted"}>{STATUS_ORDEM[o.status as keyof typeof STATUS_ORDEM]}</Pill></div>
        <p className="text-sm">{dataHoraBR(o.agendada_em)} · {equipe?.find((u) => u.id === o.tecnico_id)?.nome ?? "Técnico"}{o.chamados && ` · Chamado #${o.chamados.protocolo}`}</p>
        {o.endereco && <a className="inline-flex items-center gap-1 break-all text-sm text-primary hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.endereco)}`} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 shrink-0" />Abrir no mapa · {o.endereco}</a>}
        {o.instrucoes && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{o.instrucoes}</p>}
        {o.relatorio_tecnico && <p className="whitespace-pre-wrap break-words text-sm"><span className="font-medium">Relatório:</span> {o.relatorio_tecnico}</p>}
        {o.concluida_em && <p className="text-xs text-muted-foreground">Concluída em {dataHoraBR(o.concluida_em)}</p>}
      </div>
      <div className="flex shrink-0 items-start gap-2"><Button variant="outline" size="sm" onClick={() => setForm(o)}><Pencil />Editar</Button>{["agendada", "em_execucao"].includes(o.status) && <Button size="sm" onClick={() => { setRelatorio(""); setConcluir(o); }}><Check />Concluir</Button>}</div>
    </article>)}</div>}
    <Dialog open={form !== null} onOpenChange={(open) => { if (!open) setForm(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{form === "nova" ? "Nova ordem de serviço" : "Editar ordem de serviço"}</DialogTitle></DialogHeader>{form && <OrdemForm {...(form !== "nova" ? { ordem: form } : {})} onSaved={() => setForm(null)} />}</DialogContent></Dialog>
    <Dialog open={concluir !== null} onOpenChange={(open) => { if (!open) setConcluir(null); }}><DialogContent><DialogHeader><DialogTitle>Concluir ordem de serviço</DialogTitle></DialogHeader><form onSubmit={finalizar} className="space-y-4"><Field label="Relatório do técnico"><Textarea aria-label="Relatório do técnico" required rows={5} value={relatorio} onChange={(e) => setRelatorio(e.target.value)} /></Field><div className="flex justify-end"><Button type="submit" disabled={loading}><Check />{loading ? "Concluindo…" : "Confirmar conclusão"}</Button></div></form></DialogContent></Dialog>
  </>;
}