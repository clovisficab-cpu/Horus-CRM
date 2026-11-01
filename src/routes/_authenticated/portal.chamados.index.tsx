import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { abrirChamadoIA } from "@/lib/chamados-ia.functions";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, Empty, errMsg, Field, PageHeader, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS, StatusPill } from "@/lib/chamados";
import { dataHoraBR } from "@/lib/format";
import { portalHead, portalQuery } from "@/lib/portal-data";

export const Route = createFileRoute("/_authenticated/portal/chamados/")({
  head: () => portalHead("Chamados", "Abra e acompanhe seus chamados de suporte Horus."),
  loader: ({ context }) => context.queryClient.ensureQueryData(portalQuery(context.user.id)),
  component: PortalChamados,
});

function PortalChamados() {
  const { user } = Route.useRouteContext();
  const { data: portal } = useSuspenseQuery(portalQuery(user.id));
  const [abrir, setAbrir] = useState(false);
  const ids = portal.clientes.map((c) => c.id);
  const { data, isLoading } = useQuery({
    queryKey: ["portal", user.id, "chamados"],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("chamados").select("id,protocolo,assunto,categoria,status,created_at").in("cliente_id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return <>
    <PageHeader title="Chamados" subtitle="Precisa de ajuda? Abra um chamado e acompanhe a resposta da equipe." actions={ids.length > 0 && <Button onClick={() => setAbrir(true)}><Plus />Abrir chamado</Button>} />
    {ids.length === 0 ? <Empty>Seu acesso ainda não está vinculado a um cadastro de cliente.</Empty>
      : isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p>
      : !data?.length ? <Empty>Você ainda não abriu nenhum chamado.</Empty>
      : <div className="space-y-2">{data.map((c) => (
        <Link key={c.id} to="/portal/chamados/$id" params={{ id: c.id }}>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
            <div className="min-w-0"><div className="text-xs text-muted-foreground">#{c.protocolo} · {CATEGORIAS[c.categoria]} · {dataHoraBR(c.created_at)}</div><div className="truncate font-medium">{c.assunto}</div></div>
            <StatusPill status={c.status} />
          </Card>
        </Link>))}</div>}
    {abrir && ids[0] && <AbrirChamado clienteId={ids[0]} cameras={portal.cameras} onClose={() => setAbrir(false)} />}
  </>;
}

function AbrirChamado({ clienteId, cameras, onClose }: { clienteId: string; cameras: { id: string; nome: string; cliente_id: string | null }[]; onClose: () => void }) {
  const navigate = useNavigate();
  const abrirFn = useServerFn(abrirChamadoIA);
  const [camera, setCamera] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (descricao.trim().length < 5) return void toast.error("Descreva o problema.");
    setSalvando(true);
    const cam = cameras.find((c) => c.id === camera);
    const cliente = cam?.cliente_id ?? clienteId;
    const assunto = (CATEGORIAS[categoria] || "Solicitação de suporte") + (cam ? ` — ${cam.nome}` : "");
    try {
      const data = await abrirFn({ data: { cliente_id: cliente, camera_id: camera || null, canal: "portal", categoria: categoria || null, prioridade: null, assunto: assunto.slice(0, 200), descricao: descricao.trim() } });
      toast.success("Chamado aberto! Nossa equipe vai responder em breve.");
      onClose();
      navigate({ to: "/portal/chamados/$id", params: { id: data.id } });
    } catch (error) { toast.error(errMsg(error)); }
    finally { setSalvando(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Abrir chamado</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="space-y-3">
          <Field label="Câmera (opcional)"><select className={selectCls} value={camera} onChange={(e) => setCamera(e.target.value)}><option value="">Nenhuma específica</option>{cameras.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          <Field label="Tipo"><select className={selectCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Não sei</option>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Descrição"><Textarea rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={4000} placeholder="Conte o que está acontecendo…" /></Field>
          <div className="flex justify-end"><Button type="submit" disabled={salvando}>{salvando ? "Enviando…" : "Abrir chamado"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
