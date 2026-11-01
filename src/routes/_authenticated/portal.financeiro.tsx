import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, Empty, PageHeader, Pill, toneStatus } from "@/components/kit";
import { brl, dataBR, STATUS_FATURA } from "@/lib/format";
import { portalHead, portalQuery, statusFatura } from "@/lib/portal-data";

export const Route = createFileRoute("/_authenticated/portal/financeiro")({
  head: () => portalHead("Financeiro", "Consulte seus contratos, planos, vencimentos e o status das suas faturas Horus."),
  loader: ({ context }) => context.queryClient.ensureQueryData(portalQuery(context.user.id)),
  component: PortalFinanceiro,
});

const STATUS_CONTRATO: Record<string, string> = { ativo: "Ativo", suspenso: "Suspenso", cancelado: "Cancelado", inativo: "Inativo" };

function PortalFinanceiro() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(portalQuery(user.id));
  return <>
    <PageHeader title="Financeiro" />
    <section aria-labelledby="contratos"><h2 id="contratos" className="mb-4 text-xl font-semibold">{data.contratos.length > 1 ? "Meus contratos" : "Meu contrato"}</h2>
      {data.contratos.length === 0 ? <Empty>Nenhum contrato vinculado ao seu cadastro.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{data.contratos.map((contrato) => <Card key={contrato.id}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{contrato.planos?.nome ?? "Plano não informado"}</h3><Pill tone={toneStatus[contrato.status]}>{STATUS_CONTRATO[contrato.status] ?? contrato.status}</Pill></div>
        {data.clientes.length > 1 && <p className="mt-1 text-sm text-muted-foreground">{data.clientes.find((c) => c.id === contrato.cliente_id)?.nome}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-4"><div><dt className="text-sm text-muted-foreground">Valor mensal</dt><dd className="mt-1 text-xl font-semibold">{brl(contrato.valor_mensal)}</dd></div><div><dt className="text-sm text-muted-foreground">Dia de vencimento</dt><dd className="mt-1 text-xl font-semibold">Dia {contrato.dia_vencimento}</dd></div></dl>
      </Card>)}</div>}
    </section>
    <section className="mt-10" aria-labelledby="faturas"><h2 id="faturas" className="mb-4 text-xl font-semibold">Faturas</h2>
      {data.faturas.length === 0 ? <Empty>Nenhuma fatura registrada.</Empty> : <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Referência</th><th className="px-4 py-3 font-medium">Vencimento</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Pagamento</th></tr></thead>
          <tbody className="divide-y divide-border">{data.faturas.map((fatura) => { const status = statusFatura(fatura); return <tr key={fatura.id}><td className="px-4 py-4">{fatura.referencia}</td><td className="whitespace-nowrap px-4 py-4">{dataBR(fatura.vencimento)}</td><td className="whitespace-nowrap px-4 py-4 font-medium">{brl(fatura.valor)}</td><td className="px-4 py-4"><Pill tone={toneStatus[status]}>{STATUS_FATURA[status] ?? status}</Pill></td><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{dataBR(fatura.pago_em)}</td></tr>; })}</tbody>
        </table>
      </div>}
    </section>
  </>;
}