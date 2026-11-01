import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { listarResponsaveis } from "@/lib/admin.functions";
import { dataLocal, STATUS_ORDEM, TIPOS_ORDEM } from "@/lib/ordens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, selectCls, errMsg } from "@/components/kit";

type Props = { ordem?: Tables<"ordens_servico">; clienteId?: string; chamadoId?: string; onSaved: () => void };

export function OrdemForm({ ordem, clienteId, chamadoId, onSaved }: Props) {
  const listar = useServerFn(listarResponsaveis);
  const qc = useQueryClient();
  const [cliente, setCliente] = useState(ordem?.cliente_id ?? clienteId ?? "");
  const [chamado, setChamado] = useState(ordem?.chamado_id ?? chamadoId ?? "");
  const [tecnico, setTecnico] = useState(ordem?.tecnico_id ?? "");
  const [tipo, setTipo] = useState(ordem?.tipo ?? "manutencao");
  const [status, setStatus] = useState(ordem?.status ?? "agendada");
  const [agenda, setAgenda] = useState(ordem ? dataLocal(ordem.agendada_em) : "");
  const [endereco, setEndereco] = useState<string | undefined>(ordem?.endereco);
  const [instrucoes, setInstrucoes] = useState(ordem?.instrucoes ?? "");
  const [loading, setLoading] = useState(false);
  const { data, isError } = useQuery({ queryKey: ["admin", "ordens", "form"], queryFn: async () => {
    const [clientes, chamados, equipe] = await Promise.all([
      supabase.from("clientes").select("id,nome,endereco").order("nome"),
      supabase.from("chamados").select("id,cliente_id,protocolo,assunto").order("created_at", { ascending: false }), listar(),
    ]);
    if (clientes.error) throw clientes.error;
    if (chamados.error) throw chamados.error;
    return { clientes: clientes.data, chamados: chamados.data, equipe };
  } });
  const enderecoAtual = endereco ?? data?.clientes.find((c) => c.id === cliente)?.endereco ?? "";
  async function salvar(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const valores = { cliente_id: cliente, chamado_id: chamado || null, tecnico_id: tecnico, tipo, status, agendada_em: new Date(agenda).toISOString(), endereco: enderecoAtual.trim(), instrucoes: instrucoes.trim() || null };
      const resposta = ordem ? await supabase.from("ordens_servico").update(valores).eq("id", ordem.id).select("id").single() : await supabase.from("ordens_servico").insert(valores).select("id").single();
      if (resposta.error) throw resposta.error;
      await qc.invalidateQueries({ queryKey: ["admin", "ordens"] });
      await qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success("Ordem de serviço salva."); onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setLoading(false); }
  }
  return <form onSubmit={salvar} className="space-y-4">
    {isError && <p className="text-sm text-destructive">Não foi possível carregar clientes e equipe.</p>}
    <Field label="Cliente"><select aria-label="Cliente" required className={selectCls} value={cliente} disabled={!!clienteId || !!ordem} onChange={(e) => { setCliente(e.target.value); setChamado(""); setEndereco(undefined); }}><option value="">Selecione</option>{data?.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Tipo"><select aria-label="Tipo" className={selectCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>{Object.entries(TIPOS_ORDEM).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Status"><select aria-label="Status da ordem" className={selectCls} value={status} disabled={ordem?.status === "concluida"} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS_ORDEM).filter(([k]) => k !== "concluida" || ordem?.status === "concluida").map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
    </div>
    <Field label="Técnico"><select aria-label="Técnico" required className={selectCls} value={tecnico} onChange={(e) => setTecnico(e.target.value)}><option value="">Selecione</option>{data?.equipe.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></Field>
    <Field label="Data e hora agendada"><Input aria-label="Data e hora agendada" type="datetime-local" required value={agenda} onChange={(e) => setAgenda(e.target.value)} /></Field>
    <Field label="Endereço"><Input aria-label="Endereço" required value={enderecoAtual} onChange={(e) => setEndereco(e.target.value)} /></Field>
    <Field label="Chamado vinculado"><select aria-label="Chamado vinculado" className={selectCls} value={chamado} disabled={!!chamadoId} onChange={(e) => setChamado(e.target.value)}><option value="">Sem chamado</option>{data?.chamados.filter((c) => c.cliente_id === cliente).map((c) => <option key={c.id} value={c.id}>#{c.protocolo} · {c.assunto}</option>)}</select></Field>
    <Field label="Instruções"><Textarea aria-label="Instruções" value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} /></Field>
    <div className="flex justify-end"><Button type="submit" variant="hero" disabled={loading || !data}>{loading ? "Salvando…" : "Salvar ordem"}</Button></div>
  </form>;
}

export function AgendarVisita({ clienteId, chamadoId }: { clienteId: string; chamadoId?: string }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" onClick={() => setOpen(true)}><CalendarPlus />Agendar visita</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Agendar visita</DialogTitle></DialogHeader><OrdemForm clienteId={clienteId} {...(chamadoId ? { chamadoId } : {})} onSaved={() => setOpen(false)} /></DialogContent></Dialog></>;
}