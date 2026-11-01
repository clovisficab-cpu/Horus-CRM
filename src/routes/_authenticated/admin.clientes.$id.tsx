import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus } from "lucide-react";
import { ClienteForm } from "@/components/ClienteForm";
import { AgendarVisita } from "@/components/OrdemForm";
import { Card, Empty, Field, PageHeader, Pill, errMsg, selectCls, toneStatus } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { criarAcessoPortal } from "@/lib/admin.functions";
import { brl, dataBR, dataHoraBR, STATUS_CAMERA, STATUS_FATURA } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({ head: () => equipeHead("Ficha do cliente", "Dados e serviços vinculados a um cliente Horus."), component: P });

const TIPOS_ATIV: Record<string, string> = { ligacao: "Ligação", visita: "Visita", anotacao: "Anotação", whatsapp: "WhatsApp", sistema: "Sistema" };

function P() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const key = ["admin", "cliente", id];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [c, cams, cts, fats, ativ, planos] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
        supabase.from("cameras").select("*").eq("cliente_id", id).order("nome"),
        supabase.from("contratos").select("*, planos(nome)").eq("cliente_id", id).order("created_at", { ascending: false }),
        supabase.from("faturas").select("*").eq("cliente_id", id).order("vencimento", { ascending: false }),
        supabase.from("atividades").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
        supabase.from("planos").select("*").eq("ativo", true).order("mensalidade"),
      ]);
      return { cliente: c.data, cameras: cams.data ?? [], contratos: cts.data ?? [], faturas: fats.data ?? [], atividades: ativ.data ?? [], planos: planos.data ?? [] };
    },
  });
  const [editar, setEditar] = useState(false);
  const [novoContrato, setNovoContrato] = useState(false);
  const [acesso, setAcesso] = useState(false);
  const recarregar = () => qc.invalidateQueries({ queryKey: key });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  const c = data?.cliente;
  if (!c || !data) return <Empty>Cliente não encontrado. <Link to="/admin/clientes" className="text-primary">Voltar</Link></Empty>;

  return (
    <>
      <PageHeader title={c.nome} subtitle={`${c.tipo} · ${c.documento ?? "sem documento"}`} actions={<>
        <AgendarVisita clienteId={id} />
        <Button variant="outline" onClick={() => setEditar(true)}><Pencil /> Editar</Button>
        <Button variant="hero" onClick={() => setAcesso(true)}><KeyRound /> Criar acesso ao portal</Button>
      </>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Dados</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[["Status", <Pill key="s" tone={toneStatus[c.status]}>{c.status}</Pill>], ["E-mail", c.email], ["Telefone", c.telefone], ["WhatsApp", c.whatsapp], ["Endereço", c.endereco], ["Cidade", c.cidade ? `${c.cidade}/${c.uf ?? ""}` : null], ["Observações", c.observacoes]].map(([k, v]) => (
              <div key={String(k)}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Câmeras ({data.cameras.length})</h2>
          {data.cameras.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma câmera vinculada.</p> : (
            <ul className="divide-y divide-border text-sm">
              {data.cameras.map((cam) => <li key={cam.id} className="flex justify-between py-2"><span>{cam.nome} <span className="text-muted-foreground">{cam.local}</span></span><Pill tone={toneStatus[cam.status]}>{STATUS_CAMERA[cam.status] ?? cam.status}</Pill></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Contratos</h2><Button size="sm" variant="outline" onClick={() => setNovoContrato(true)}><Plus /> Novo</Button></div>
          {data.contratos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contrato.</p> : (
            <ul className="divide-y divide-border text-sm">
              {data.contratos.map((ct) => <li key={ct.id} className="flex justify-between py-2"><span>{ct.planos?.nome ?? "Sem plano"} · {brl(ct.valor_mensal)} · venc. dia {ct.dia_vencimento}</span><Pill tone={toneStatus[ct.status]}>{ct.status}</Pill></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Faturas</h2>
          {data.faturas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma fatura.</p> : (
            <ul className="divide-y divide-border text-sm">
              {data.faturas.map((f) => <li key={f.id} className="flex justify-between py-2"><span>{f.referencia} · {brl(f.valor)} · venc. {dataBR(f.vencimento)}</span><Pill tone={toneStatus[f.status]}>{STATUS_FATURA[f.status] ?? f.status}</Pill></li>)}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="mb-3 font-semibold">Linha do tempo</h2>
        <NovaAtividade clienteId={id} onSaved={recarregar} />
        <ul className="mt-4 space-y-3">
          {data.atividades.map((a) => (
            <li key={a.id} className="border-l-2 border-primary/50 pl-3 text-sm">
              <div className="text-xs text-muted-foreground">{TIPOS_ATIV[a.tipo] ?? a.tipo} · {dataHoraBR(a.created_at)}</div>
              <div className="whitespace-pre-wrap">{a.descricao}</div>
            </li>
          ))}
          {data.atividades.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma interação registrada.</li>}
        </ul>
      </Card>

      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <ClienteForm cliente={c} onSaved={() => { setEditar(false); recarregar(); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={novoContrato} onOpenChange={setNovoContrato}>
        <DialogContent><DialogHeader><DialogTitle>Novo contrato</DialogTitle></DialogHeader>
          <ContratoForm clienteId={id} planos={data.planos} onSaved={() => { setNovoContrato(false); recarregar(); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={acesso} onOpenChange={setAcesso}>
        <DialogContent><DialogHeader><DialogTitle>Criar acesso ao portal</DialogTitle></DialogHeader>
          <AcessoForm clienteId={id} nome={c.nome} email={c.email ?? ""} onSaved={() => { setAcesso(false); recarregar(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function NovaAtividade({ clienteId, onSaved }: { clienteId: string; onSaved: () => void }) {
  const [tipo, setTipo] = useState("ligacao");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  async function salvar() {
    if (!descricao.trim()) return void toast.error("Descreva a interação");
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("atividades").insert({ cliente_id: clienteId, tipo, descricao: descricao.trim(), autor: u.user?.id ?? null });
    setLoading(false);
    if (error) return void toast.error(error.message);
    setDescricao("");
    onSaved();
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${selectCls} sm:w-40`}>
        <option value="ligacao">Ligação</option><option value="visita">Visita</option><option value="anotacao">Anotação</option><option value="whatsapp">WhatsApp</option>
      </select>
      <Textarea rows={2} placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <Button onClick={salvar} disabled={loading}>Registrar</Button>
    </div>
  );
}

function ContratoForm({ clienteId, planos, onSaved }: { clienteId: string; planos: { id: string; nome: string; mensalidade: number }[]; onSaved: () => void }) {
  const [planoId, setPlanoId] = useState(planos[0]?.id ?? "");
  const [valor, setValor] = useState(String(planos[0]?.mensalidade ?? ""));
  const [dia, setDia] = useState("10");
  const [loading, setLoading] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const d = Number(dia);
    if (d < 1 || d > 31) return void toast.error("Dia de vencimento inválido");
    setLoading(true);
    const { error } = await supabase.from("contratos").insert({ cliente_id: clienteId, plano_id: planoId || null, valor_mensal: Number(valor.replace(",", ".")) || 0, dia_vencimento: d });
    setLoading(false);
    if (error) return void toast.error(error.message);
    toast.success("Contrato criado");
    onSaved();
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <Field label="Plano">
        <select className={selectCls} value={planoId} onChange={(e) => { setPlanoId(e.target.value); const p = planos.find((x) => x.id === e.target.value); if (p) setValor(String(p.mensalidade)); }}>
          {planos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {brl(p.mensalidade)}</option>)}
          <option value="">Sem plano</option>
        </select>
      </Field>
      <Field label="Valor mensal (R$)"><Input value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
      <Field label="Dia de vencimento"><Input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} /></Field>
      <div className="flex justify-end"><Button type="submit" variant="hero" disabled={loading}>Criar contrato</Button></div>
    </form>
  );
}

function AcessoForm({ clienteId, nome: n0, email: e0, onSaved }: { clienteId: string; nome: string; email: string; onSaved: () => void }) {
  const criar = useServerFn(criarAcessoPortal);
  const [nome, setNome] = useState(n0);
  const [email, setEmail] = useState(e0);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar({ data: { clienteId, nome, email, password } });
      toast.success("Acesso criado");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={salvar} className="space-y-4">
      <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field label="E-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Senha (mín. 6 caracteres)"><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <div className="flex justify-end"><Button type="submit" variant="hero" disabled={loading}>{loading ? "Criando..." : "Criar acesso"}</Button></div>
    </form>
  );
}
