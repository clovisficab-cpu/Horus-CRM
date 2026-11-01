import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Empty, errMsg, Field, PageHeader, Pill, selectCls, toneStatus } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR, STATUS_FATURA } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";
import { faturasAGerar, referenciaAtual } from "@/lib/financeiro";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  head: () => equipeHead("Financeiro", "Contratos, faturas e receita da operação Horus."),
  component: Financeiro,
});

const STATUS_CONTRATO: Record<string, string> = { ativo: "Ativo", suspenso: "Suspenso", cancelado: "Cancelado" };

function Financeiro() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(referenciaAtual());
  const [fStatus, setFStatus] = useState("");
  const [fMes, setFMes] = useState("");
  const [busca, setBusca] = useState("");
  const [gerando, setGerando] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "financeiro"],
    queryFn: async () => {
      const [contratos, faturas] = await Promise.all([
        supabase.from("contratos").select("*,planos(nome),clientes(nome)").order("created_at", { ascending: false }),
        supabase.from("faturas").select("*,clientes(nome)").order("vencimento", { ascending: false }),
      ]);
      if (contratos.error) throw contratos.error;
      if (faturas.error) throw faturas.error;
      return { contratos: contratos.data ?? [], faturas: faturas.data ?? [] };
    },
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin", "financeiro"] });

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = referenciaAtual();
  const faturas = data?.faturas ?? [];
  const contratos = data?.contratos ?? [];
  const efetivo = (f: (typeof faturas)[number]) => (f.status === "em_aberto" && f.vencimento < hoje ? "vencido" : f.status);

  const cards = [
    { label: "Receita mensal recorrente", valor: brl(contratos.filter((c) => c.status === "ativo").reduce((s, c) => s + Number(c.valor_mensal), 0)) },
    { label: "Total em aberto", valor: brl(faturas.filter((f) => f.status === "em_aberto").reduce((s, f) => s + Number(f.valor), 0)) },
    { label: "Total vencido", valor: brl(faturas.filter((f) => efetivo(f) === "vencido").reduce((s, f) => s + Number(f.valor), 0)) },
    { label: "Recebido no mês", valor: brl(faturas.filter((f) => f.status === "pago" && f.pago_em?.startsWith(mesAtual)).reduce((s, f) => s + Number(f.valor), 0)) },
  ];

  async function gerarFaturas() {
    if (!/^\d{4}-\d{2}$/.test(mes)) { toast.error("Informe o mês no formato AAAA-MM."); return; }
    setGerando(true);
    try {
      const novas = faturasAGerar(contratos, faturas, mes);
      if (novas.length === 0) { toast.info("Nenhuma fatura nova para este mês."); return; }
      const { error } = await supabase.from("faturas").insert(novas);
      if (error) throw error;
      toast.success(`${novas.length} fatura(s) criada(s) para ${mes}.`);
      await recarregar();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setGerando(false);
    }
  }

  async function atualizarVencidas() {
    const { error } = await supabase.from("faturas").update({ status: "vencido" }).eq("status", "em_aberto").lt("vencimento", hoje);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Faturas vencidas atualizadas.");
    await recarregar();
  }

  async function darBaixa(id: string) {
    const data = window.prompt("Data do pagamento (AAAA-MM-DD):", hoje);
    if (!data) return;
    const { error } = await supabase.from("faturas").update({ status: "pago", pago_em: data }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Baixa registrada.");
    await recarregar();
  }

  async function estornar(id: string) {
    const { error } = await supabase.from("faturas").update({ status: "em_aberto", pago_em: null }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Fatura estornada.");
    await recarregar();
  }

  async function cancelarFatura(id: string) {
    if (!window.confirm("Cancelar esta fatura?")) return;
    const { error } = await supabase.from("faturas").update({ status: "cancelado" }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Fatura cancelada.");
    await recarregar();
  }

  async function statusContrato(id: string, status: string) {
    const { error } = await supabase.from("contratos").update({ status }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Contrato atualizado.");
    await recarregar();
  }

  const filtradas = faturas.filter((f) => {
    if (fStatus && efetivo(f) !== fStatus) return false;
    if (fMes && f.referencia !== fMes) return false;
    if (busca && !f.clientes?.nome?.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Contratos, faturas e receita" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-bold">{c.valor}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Gerar faturas do mês">
            <Input value={mes} onChange={(e) => setMes(e.target.value)} placeholder="AAAA-MM" className="w-36" />
          </Field>
          <Button onClick={gerarFaturas} disabled={gerando}>{gerando ? "Gerando…" : "Gerar faturas do mês"}</Button>
          <Button variant="outline" onClick={atualizarVencidas}>Atualizar vencidas</Button>
        </div>
      </Card>

      <section className="mt-8" aria-labelledby="faturas">
        <h2 id="faturas" className="mb-4 text-xl font-semibold">Faturas</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente" className="w-56" />
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls + " w-44"}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_FATURA).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <Input value={fMes} onChange={(e) => setFMes(e.target.value)} placeholder="Referência AAAA-MM" className="w-44" />
        </div>
        {filtradas.length === 0 ? <Empty>Nenhuma fatura encontrada.</Empty> : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground"><tr>
                <th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Referência</th><th className="px-4 py-3 font-medium">Vencimento</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtradas.map((f) => {
                  const status = efetivo(f);
                  return (
                    <tr key={f.id}>
                      <td className="px-4 py-3 font-medium">{f.clientes?.nome ?? "—"}</td>
                      <td className="px-4 py-3">{f.referencia}</td>
                      <td className="whitespace-nowrap px-4 py-3">{dataBR(f.vencimento)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{brl(f.valor)}</td>
                      <td className="px-4 py-3"><Pill tone={toneStatus[status]}>{STATUS_FATURA[status] ?? status}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {status !== "pago" && status !== "cancelado" && <Button size="sm" variant="outline" onClick={() => darBaixa(f.id)}>Dar baixa</Button>}
                          {f.status === "pago" && <Button size="sm" variant="outline" onClick={() => estornar(f.id)}>Estornar</Button>}
                          {status !== "cancelado" && <Button size="sm" variant="ghost" onClick={() => cancelarFatura(f.id)}>Cancelar</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="contratos">
        <h2 id="contratos" className="mb-4 text-xl font-semibold">Contratos</h2>
        {contratos.length === 0 ? <Empty>Nenhum contrato cadastrado.</Empty> : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground"><tr>
                <th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Plano</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Vencimento</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {contratos.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.clientes?.nome ?? "—"}</td>
                    <td className="px-4 py-3">{c.planos?.nome ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{brl(c.valor_mensal)}</td>
                    <td className="px-4 py-3">Dia {c.dia_vencimento}</td>
                    <td className="px-4 py-3"><Pill tone={toneStatus[c.status]}>{STATUS_CONTRATO[c.status] ?? c.status}</Pill></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {c.status === "ativo" && <Button size="sm" variant="outline" onClick={() => statusContrato(c.id, "suspenso")}>Suspender</Button>}
                        {c.status === "suspenso" && <Button size="sm" variant="outline" onClick={() => statusContrato(c.id, "ativo")}>Reativar</Button>}
                        {c.status !== "cancelado" && <Button size="sm" variant="ghost" onClick={() => statusContrato(c.id, "cancelado")}>Cancelar</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
