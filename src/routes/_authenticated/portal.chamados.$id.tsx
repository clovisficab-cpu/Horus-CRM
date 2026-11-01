import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Star } from "lucide-react";
import { Card, errMsg, PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS, Conversa, Responder, StatusPill } from "@/lib/chamados";
import { dataHoraBR } from "@/lib/format";
import { portalHead } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal/chamados/$id")({
  head: () => portalHead("Chamado", "Acompanhe a conversa do seu chamado com a equipe Horus."),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [nota, setNota] = useState(0);
  const chave = ["portal", user.id, "chamado", id];
  const { data, isLoading } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const [ch, msgs] = await Promise.all([
        supabase.from("chamados").select("id,protocolo,assunto,categoria,status,avaliacao,created_at").eq("id", id).maybeSingle(),
        supabase.from("chamado_mensagens").select("*").eq("chamado_id", id).eq("nota_interna", false).order("created_at"),
      ]);
      if (ch.error) throw ch.error;
      return { chamado: ch.data, mensagens: msgs.data ?? [] };
    },
    refetchInterval: 20_000,
  });
  const recarregar = () => { qc.invalidateQueries({ queryKey: chave }); qc.invalidateQueries({ queryKey: ["portal", user.id, "chamados"] }); };

  async function enviar(texto: string) {
    const { error } = await supabase.from("chamado_mensagens").insert({ chamado_id: id, autor: "cliente", user_id: user.id, texto });
    if (error) { toast.error(errMsg(error)); throw error; }
    recarregar();
  }

  async function avaliar() {
    const { error } = await supabase.from("chamados").update({ avaliacao: nota, status: "fechado" }).eq("id", id);
    if (error) return void toast.error(errMsg(error));
    toast.success("Obrigado pela avaliação!");
    recarregar();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Chamado não encontrado.</p>;
  const c = data.chamado;
  if (!c) return <p className="text-sm text-muted-foreground">Chamado não encontrado.</p>;

  return <>
    <Link to="/portal/chamados" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Meus chamados</Link>
    <PageHeader title={`#${c.protocolo} · ${c.assunto}`} subtitle={`${CATEGORIAS[c.categoria]} · aberto em ${dataHoraBR(c.created_at)}`} actions={<StatusPill status={c.status} />} />
    <Card className="space-y-6">
      <Conversa mensagens={data.mensagens} ladoCliente />
      {c.status === "resolvido" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="mb-2 text-sm font-medium">Seu problema foi resolvido? Avalie o atendimento:</p>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`Nota ${n}`} onClick={() => setNota(n)}>
                <Star className={cn("h-7 w-7", n <= nota ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            ))}
            <Button className="ml-2" disabled={!nota} onClick={avaliar}>Avaliar e fechar</Button>
          </div>
        </div>
      )}
      {c.avaliacao && <p className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-primary text-primary" />Você avaliou com nota {c.avaliacao}/5.</p>}
      {c.status !== "fechado" && <Responder onEnviar={(t) => enviar(t)} />}
    </Card>
  </>;
}
