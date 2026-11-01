import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Star } from "lucide-react";
import { Card, errMsg, Field, PageHeader, selectCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { listarResponsaveis } from "@/lib/admin.functions";
import { sugerirRespostaIA } from "@/lib/chamados-ia.functions";
import { enviarRespostaChamadoWhatsApp } from "@/lib/whatsapp.functions";
import { CANAIS, CATEGORIAS, Conversa, PRIORIDADES, Responder, Sla, STATUS_CHAMADO, StatusPill } from "@/lib/chamados";
import { dataHoraBR } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";
import { AgendarVisita } from "@/components/OrdemForm";

export const Route = createFileRoute("/_authenticated/admin/chamados/$id")({
  head: () => equipeHead("Chamado", "Atendimento de chamado de suporte Horus."),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const responsaveisFn = useServerFn(listarResponsaveis);
  const sugerirFn = useServerFn(sugerirRespostaIA);
  const respostaFn = useServerFn(enviarRespostaChamadoWhatsApp);
  const { data: resumo } = useQuery({ queryKey: ["admin", "chamado", id, "resumo-ia"], queryFn: async () => {
    const { data, error } = await supabase.from("chamados_resumos_ia").select("resumo_ia").eq("chamado_id", id).maybeSingle();
    if (error) throw error;
    return data;
  } });
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "chamado", id],
    queryFn: async () => {
      const [ch, msgs] = await Promise.all([
        supabase.from("chamados").select("*, clientes(id,nome), cameras(nome)").eq("id", id).single(),
        supabase.from("chamado_mensagens").select("*").eq("chamado_id", id).order("created_at"),
      ]);
      if (ch.error) throw ch.error;
      return { chamado: ch.data, mensagens: msgs.data ?? [] };
    },
    refetchInterval: 20_000,
  });
  const { data: equipe } = useQuery({ queryKey: ["admin", "responsaveis"], queryFn: () => responsaveisFn(), staleTime: 300_000 });

  const recarregar = () => { qc.invalidateQueries({ queryKey: ["admin", "chamado", id] }); qc.invalidateQueries({ queryKey: ["admin", "chamados"] }); };

  async function alterar(campo: "status" | "prioridade" | "responsavel", valor: string) {
    const atualizacao: TablesUpdate<"chamados"> = { [campo]: valor || null };
    const { error } = await supabase.from("chamados").update(atualizacao).eq("id", id);
    if (error) return void toast.error(errMsg(error));
    toast.success("Chamado atualizado.");
    recarregar();
  }

  async function enviar(texto: string, nota: boolean) {
    if (data?.chamado.canal === 'whatsapp') {
      try { await respostaFn({ data: { id, texto, nota } }); recarregar(); return; }
      catch (error) { toast.error(errMsg(error)); throw error; }
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("chamado_mensagens").insert({ chamado_id: id, autor: "equipe", user_id: u.user?.id ?? null, texto, nota_interna: nota });
    if (error) { toast.error(errMsg(error)); throw error; }
    recarregar();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Chamado não encontrado.</p>;
  const c = data.chamado;

  return (
    <>
      <Link to="/admin/chamados" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Chamados</Link>
      <PageHeader title={`#${c.protocolo} · ${c.assunto}`} subtitle={`${c.clientes?.nome ?? ""} · aberto em ${dataHoraBR(c.created_at)}`} actions={<><AgendarVisita clienteId={c.cliente_id} chamadoId={id} /><StatusPill status={c.status} /></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="space-y-6">
          {resumo?.resumo_ia && <div className="border-l-2 border-primary pl-4"><h2 className="mb-1 text-sm font-semibold text-primary">Resumo IA</h2><p className="whitespace-pre-wrap text-sm">{resumo.resumo_ia}</p></div>}
          {c.descricao && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.descricao}</p>}
          <Conversa mensagens={data.mensagens} />
          {c.status !== "fechado" && <Responder onEnviar={enviar} permiteNota onSugerir={() => sugerirFn({ data: { id } })} />}
        </Card>
        <Card className="space-y-4 self-start">
          <Field label="Status"><select className={selectCls} value={c.status} onChange={(e) => alterar("status", e.target.value)}>{Object.entries(STATUS_CHAMADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Prioridade"><select className={selectCls} value={c.prioridade} onChange={(e) => alterar("prioridade", e.target.value)}>{Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Responsável"><select className={selectCls} value={c.responsavel ?? ""} onChange={(e) => alterar("responsavel", e.target.value)}><option value="">Sem responsável</option>{equipe?.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></Field>
          <div className="space-y-1 border-t border-border pt-4 text-sm">
            <Sla chamado={c} />
            <div><span className="text-muted-foreground">Categoria:</span> {CATEGORIAS[c.categoria]}</div>
            <div><span className="text-muted-foreground">Canal:</span> {CANAIS[c.canal]}</div>
            {c.cameras && <div><span className="text-muted-foreground">Câmera:</span> {c.cameras.nome}</div>}
            {c.clientes && <Link to="/admin/clientes/$id" params={{ id: c.clientes.id }} className="text-primary hover:underline">Ver ficha do cliente</Link>}
            {c.avaliacao && <div className="flex items-center gap-1 pt-2"><Star className="h-4 w-4 fill-primary text-primary" /> Avaliação: {c.avaliacao}/5</div>}
          </div>
        </Card>
      </div>
    </>
  );
}
