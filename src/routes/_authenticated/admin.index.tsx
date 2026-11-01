import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Headset, CameraOff, TrendingUp, Users, Workflow } from "lucide-react";
import { Card, PageHeader } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataHoraBR, ORIGENS } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";
import { intervaloHoje } from "@/lib/ordens";

export const Route = createFileRoute("/_authenticated/admin/")({ head: () => equipeHead("Dashboard", "Indicadores da operação de videomonitoramento Horus."), component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const periodo = intervaloHoje();
      const [cli, cam, con, fat, lea, rec, chs, visitas] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("cameras").select("id", { count: "exact", head: true }).eq("status", "offline"),
        supabase.from("contratos").select("valor_mensal").eq("status", "ativo"),
        supabase.from("faturas").select("valor").or(`status.eq.vencido,and(status.eq.em_aberto,vencimento.lt.${hoje})`),
        supabase.from("leads").select("valor_estimado").not("etapa", "in", "(ganho,perdido)"),
        supabase.from("leads").select("id,nome,empresa,origem,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("chamados").select("prazo_sla").not("status", "in", "(resolvido,fechado)"),
        supabase.from("ordens_servico").select("id", { count: "exact", head: true }).gte("agendada_em", periodo.inicio).lt("agendada_em", periodo.fim).neq("status", "cancelada"),
      ]);
      const soma = (rows: { [k: string]: unknown }[] | null, k: string) => (rows ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);
      return {
        clientes: cli.count ?? 0,
        visitasHoje: visitas.count ?? 0,
        offline: cam.count ?? 0,
        mrr: soma(con.data, "valor_mensal"),
        vencidasQtd: fat.data?.length ?? 0,
        vencidasValor: soma(fat.data, "valor"),
        leadsQtd: lea.data?.length ?? 0,
        leadsValor: soma(lea.data, "valor_estimado"),
        recentes: rec.data ?? [],
        chamados: chs.data?.length ?? 0,
        slaEstourado: (chs.data ?? []).filter((c) => c.prazo_sla && new Date(c.prazo_sla) < new Date()).length,
      };
    },
  });

  const cards = [
    { label: "Visitas hoje", valor: data?.visitasHoje ?? "—", icon: CalendarDays, to: "/admin/ordens" },
    { label: "Clientes ativos", valor: data?.clientes ?? "—", icon: Users, to: "/admin/clientes" },
    { label: "Câmeras offline", valor: data?.offline ?? "—", icon: CameraOff, to: "/admin/cameras", alerta: (data?.offline ?? 0) > 0 },
    { label: "Receita mensal recorrente", valor: data ? brl(data.mrr) : "—", icon: TrendingUp, to: "/admin/clientes" },
    { label: "Faturas vencidas", valor: data ? brl(data.vencidasValor) : "—", extra: data ? `${data.vencidasQtd} fatura(s)` : "", icon: AlertTriangle, to: "/admin/clientes", alerta: (data?.vencidasQtd ?? 0) > 0 },
    { label: "Leads no funil", valor: data?.leadsQtd ?? "—", extra: data ? `${brl(data.leadsValor)}/mês estimado` : "", icon: Workflow, to: "/admin/funil" },
    { label: "Chamados abertos", valor: data?.chamados ?? "—", icon: Headset, to: "/admin/chamados" },
    { label: "SLA estourado", valor: data?.slaEstourado ?? "—", icon: AlertTriangle, to: "/admin/chamados", alerta: (data?.slaEstourado ?? 0) > 0 },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral da operação Horus" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to as "/admin"}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                <c.icon className={c.alerta ? "h-4 w-4 text-destructive" : "h-4 w-4 text-primary"} />
              </div>
              <div className="mt-3 font-display text-2xl font-bold">{c.valor}</div>
              {c.extra && <div className="mt-1 text-xs text-muted-foreground">{c.extra}</div>}
            </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Últimos leads</h2>
        {data?.recentes.length ? (
          <ul className="divide-y divide-border">
            {data.recentes.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                <div><span className="font-medium">{l.nome}</span>{l.empresa && <span className="text-muted-foreground"> · {l.empresa}</span>}</div>
                <div className="text-xs text-muted-foreground">{ORIGENS[l.origem]} · {dataHoraBR(l.created_at)}</div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nenhum lead ainda.</p>}
      </Card>
    </>
  );
}
