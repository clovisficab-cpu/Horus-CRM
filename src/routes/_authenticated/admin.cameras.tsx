import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { CameraPlayer } from "@/components/CameraPlayer";
import { Empty, Field, PageHeader, Pill, selectCls, toneStatus } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { STATUS_CAMERA } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/cameras")({ head: () => equipeHead("Câmeras", "Área de gestão das câmeras de videomonitoramento Horus."), component: P });

type Camera = Tables<"cameras">;

function P() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Camera | "nova" | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cameras"],
    queryFn: async () => {
      const [cams, clis] = await Promise.all([
        supabase.from("cameras").select("*, clientes(nome)").order("nome"),
        supabase.from("clientes").select("id, nome").order("nome"),
      ]);
      return { cameras: cams.data ?? [], clientes: clis.data ?? [] };
    },
  });
  const q = busca.toLowerCase();
  const lista = (data?.cameras ?? []).filter((c) =>
    (!status || c.status === status) &&
    [c.nome, c.local, c.marca, c.ip, c.clientes?.nome].some((v) => v?.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader title="Câmeras" subtitle={`${data?.cameras.length ?? 0} cadastradas`} actions={<Button variant="hero" onClick={() => setEdit("nova")}><Plus /> Nova câmera</Button>} />
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, local, cliente, IP..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className={`${selectCls} w-48`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option><option value="online">Online</option><option value="offline">Offline</option><option value="manutencao">Manutenção</option>
        </select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : lista.length === 0 ? <Empty>Nenhuma câmera encontrada.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">Cliente</th><th className="p-3">Stream</th><th className="p-3">Pública</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-card/60" onClick={() => setEdit(c)}>
                  <td className="p-3"><div className="font-medium">{c.nome}</div><div className="text-xs text-muted-foreground">{c.local}</div></td>
                  <td className="p-3 text-muted-foreground">{c.clientes?.nome ?? "—"}</td>
                  <td className="p-3 uppercase text-muted-foreground">{c.tipo_stream}</td>
                  <td className="p-3">{c.publica ? <Pill tone="gold">Sim</Pill> : <Pill>Não</Pill>}</td>
                  <td className="p-3"><Pill tone={toneStatus[c.status]}>{STATUS_CAMERA[c.status] ?? c.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit === "nova" ? "Nova câmera" : "Editar câmera"}</DialogTitle></DialogHeader>
          {edit && <CameraForm camera={edit === "nova" ? undefined : edit} clientes={data?.clientes ?? []} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["admin", "cameras"] }); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CameraForm({ camera: c, clientes, onSaved }: { camera?: Camera | undefined; clientes: { id: string; nome: string }[]; onSaved: () => void }) {
  const [f, setF] = useState({
    nome: c?.nome ?? "", local: c?.local ?? "", cliente_id: c?.cliente_id ?? "", tipo_stream: c?.tipo_stream ?? "hls",
    stream_url: c?.stream_url ?? "", imagem_capa: c?.imagem_capa ?? "", publica: c?.publica ?? false,
    status: c?.status ?? "online", marca: c?.marca ?? "", ip: c?.ip ?? "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return void toast.error("Informe o nome");
    const payload = {
      nome: f.nome.trim(), local: f.local || null, cliente_id: f.cliente_id || null, tipo_stream: f.tipo_stream,
      stream_url: f.stream_url || null, imagem_capa: f.imagem_capa || null, publica: f.publica,
      status: f.status, marca: f.marca || null, ip: f.ip || null,
    };
    setLoading(true);
    const { error } = c ? await supabase.from("cameras").update(payload).eq("id", c.id) : await supabase.from("cameras").insert(payload);
    setLoading(false);
    if (error) return void toast.error(error.message);
    toast.success("Câmera salva");
    onSaved();
  }

  return (
    <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
      <CameraPlayer key={`${f.tipo_stream}|${f.stream_url}|${f.status}`} className="sm:col-span-2" camera={{ nome: f.nome || "Pré-visualização", local: f.local, tipo_stream: f.tipo_stream, stream_url: f.stream_url || null, imagem_capa: f.imagem_capa || null, status: f.status }} />
      <Field label="Nome *"><Input value={f.nome} onChange={set("nome")} required /></Field>
      <Field label="Local"><Input value={f.local} onChange={set("local")} /></Field>
      <Field label="Cliente">
        <select className={selectCls} value={f.cliente_id} onChange={set("cliente_id")}>
          <option value="">Nenhum</option>
          {clientes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </Field>
      <Field label="Tipo de stream">
        <select className={selectCls} value={f.tipo_stream} onChange={set("tipo_stream")}>
          <option value="hls">HLS</option><option value="mjpeg">MJPEG</option><option value="iframe">Iframe</option><option value="imagem">Imagem</option>
        </select>
      </Field>
      <Field label="URL do stream" className="sm:col-span-2"><Input value={f.stream_url} onChange={set("stream_url")} /></Field>
      <Field label="Imagem de capa (URL)" className="sm:col-span-2"><Input value={f.imagem_capa} onChange={set("imagem_capa")} /></Field>
      <Field label="Status">
        <select className={selectCls} value={f.status} onChange={set("status")}>
          <option value="online">Online</option><option value="offline">Offline</option><option value="manutencao">Manutenção</option>
        </select>
      </Field>
      <Field label="Pública na vitrine">
        <select className={selectCls} value={f.publica ? "1" : "0"} onChange={(e) => setF({ ...f, publica: e.target.value === "1" })}>
          <option value="0">Não</option><option value="1">Sim</option>
        </select>
      </Field>
      <Field label="Marca"><Input value={f.marca} onChange={set("marca")} /></Field>
      <Field label="IP"><Input value={f.ip} onChange={set("ip")} /></Field>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="hero" disabled={loading}>{loading ? "Salvando..." : "Salvar câmera"}</Button></div>
    </form>
  );
}
