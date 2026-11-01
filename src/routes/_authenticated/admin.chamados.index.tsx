import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { abrirChamadoIA } from "@/lib/chamados-ia.functions";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Card, Empty, errMsg, Field, PageHeader, Pill, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CANAIS, CATEGORIAS, PRIORIDADES, Sla, STATUS_CHAMADO, StatusPill, toneChamado } from "@/lib/chamados";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/chamados/")({
  head: () => equipeHead("Chamados", "Central de chamados de suporte dos clientes Horus."),
  component: Chamados,
});

function Chamados() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [categoria, setCategoria] = useState("");
  const [novo, setNovo] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "chamados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chamados").select("*, clientes(nome)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const q = busca.trim().toLowerCase();
  const lista = (data ?? []).filter((c) =>
    (!status || c.status === status) && (!prioridade || c.prioridade === prioridade) && (!categoria || c.categoria === categoria) &&
    (!q || String(c.protocolo).includes(q) || c.assunto.toLowerCase().includes(q) || (c.clientes?.nome ?? "").toLowerCase().includes(q)));

  return (
    <>
      <PageHeader title="Chamados" subtitle="Atendimento e suporte aos clientes" actions={<Button onClick={() => setNovo(true)}><Plus />Novo chamado</Button>} />
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Protocolo, assunto ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_CHAMADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={selectCls} value={prioridade} onChange={(e) => setPrioridade(e.target.value)}><option value="">Todas as prioridades</option>{Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={selectCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Todas as categorias</option>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !lista.length ? <Empty>Nenhum chamado encontrado.</Empty> : (
        <div className="space-y-2">
          {lista.map((c) => (
            <Link key={c.id} to="/admin/chamados/$id" params={{ id: c.id }}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">#{c.protocolo} · {c.clientes?.nome} · {CATEGORIAS[c.categoria]} · {CANAIS[c.canal]}</div>
                  <div className="truncate font-medium">{c.assunto}</div>
                  <Sla chamado={c} />
                </div>
                <div className="flex gap-2"><Pill tone={toneChamado[c.prioridade]}>{PRIORIDADES[c.prioridade]}</Pill><StatusPill status={c.status} /></div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <NovoChamado aberto={novo} onClose={() => setNovo(false)} />
    </>
  );
}

function NovoChamado({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const abrirFn = useServerFn(abrirChamadoIA);
  const [f, setF] = useState({ cliente_id: "", camera_id: "", canal: "telefone", categoria: "", prioridade: "", assunto: "", descricao: "" });
  const [salvando, setSalvando] = useState(false);
  const { data } = useQuery({
    queryKey: ["admin", "chamados", "opcoes"],
    enabled: aberto,
    queryFn: async () => {
      const [cli, cam] = await Promise.all([
        supabase.from("clientes").select("id,nome").order("nome"),
        supabase.from("cameras").select("id,nome,cliente_id").order("nome"),
      ]);
      return { clientes: cli.data ?? [], cameras: cam.data ?? [] };
    },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!f.cliente_id || !f.assunto.trim()) return void toast.error("Informe cliente e assunto.");
    setSalvando(true);
    try {
      const ch = await abrirFn({ data: { ...f, camera_id: f.camera_id || null, categoria: f.categoria || null, prioridade: f.prioridade || null } });
      toast.success("Chamado aberto.");
      if (ch.aviso) toast.warning(ch.aviso);
      onClose();
      navigate({ to: "/admin/chamados/$id", params: { id: ch.id } });
    } catch (error) { toast.error(errMsg(error)); }
    finally { setSalvando(false); }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo chamado</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente" className="sm:col-span-2"><select className={selectCls} value={f.cliente_id} onChange={(e) => setF({ ...f, cliente_id: e.target.value, camera_id: "" })}><option value="">Selecione…</option>{data?.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          <Field label="Câmera (opcional)"><select className={selectCls} value={f.camera_id} onChange={set("camera_id")}><option value="">Nenhuma</option>{data?.cameras.filter((c) => c.cliente_id === f.cliente_id).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          <Field label="Canal"><select className={selectCls} value={f.canal} onChange={set("canal")}>{Object.entries(CANAIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Categoria"><select className={selectCls} value={f.categoria} onChange={set("categoria")}><option value="">Não sei</option>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Prioridade"><select className={selectCls} value={f.prioridade} onChange={set("prioridade")}><option value="">Não informada</option>{Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Assunto" className="sm:col-span-2"><Input value={f.assunto} onChange={set("assunto")} maxLength={200} /></Field>
          <Field label="Descrição" className="sm:col-span-2"><Textarea rows={4} value={f.descricao} onChange={set("descricao")} maxLength={4000} /></Field>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit" disabled={salvando}>{salvando ? "Abrindo…" : "Abrir chamado"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
