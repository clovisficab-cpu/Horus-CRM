import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Video, ReceiptText, ArrowUpRight } from "lucide-react";
import { Card, PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { portalHead, portalQuery, statusFatura } from "@/lib/portal-data";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => portalHead("Início", "Resumo das suas câmeras, faturas em aberto e avisos da Horus."),
  loader: ({ context }) => context.queryClient.ensureQueryData(portalQuery(context.user.id)),
  component: PortalInicio,
});

function PortalInicio() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(portalQuery(user.id));
  const nome = data.clientes[0]?.nome ?? (typeof user.user_metadata?.["nome"] === "string" ? user.user_metadata["nome"] : "cliente");
  const abertas = data.faturas.filter((f) => ["em_aberto", "vencido"].includes(statusFatura(f)));
  const online = data.cameras.filter((c) => c.status === "online").length;
  return (
    <>
      <PageHeader title={`Olá, ${nome}!`} subtitle="Portal do cliente" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><h2 className="text-sm text-muted-foreground">Câmeras online / total</h2><Video className="h-5 w-5 text-primary" /></div>
          <p className="mt-4 text-3xl font-semibold tabular-nums">{online} <span className="text-xl text-muted-foreground">/ {data.cameras.length}</span></p>
          <Button asChild variant="link" className="mt-3 px-0"><Link to="/portal/cameras">Minhas câmeras<ArrowUpRight /></Link></Button>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="text-sm text-muted-foreground">Faturas em aberto</h2><ReceiptText className="h-5 w-5 text-primary" /></div>
          <p className="mt-4 text-3xl font-semibold tabular-nums">{brl(abertas.reduce((s, f) => s + f.valor, 0))}</p>
          <p className="mt-1 text-sm text-muted-foreground">{abertas.length} {abertas.length === 1 ? "fatura em aberto" : "faturas em aberto"}</p>
          <Button asChild variant="link" className="mt-3 px-0"><Link to="/portal/financeiro">Financeiro<ArrowUpRight /></Link></Button>
        </Card>
      </div>
      {data.clientes.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Seu acesso ainda não está vinculado a um cadastro de cliente. Entre em contato com a equipe Horus.</p>}
      {data.banners.length > 0 && <section className="mt-10" aria-label="Avisos do portal">
        <h2 className="mb-4 text-xl font-semibold">Avisos da Horus</h2>
        <div className="grid gap-4 lg:grid-cols-2">{data.banners.map((banner) => {
          const link = banner.botao_link;
          const seguro = link && (/^https?:\/\//i.test(link) || (/^\/(?!\/)/.test(link)));
          return <article key={banner.id} className="overflow-hidden rounded-lg border border-border bg-card">
            {banner.imagem_url && <img src={banner.imagem_url} alt={banner.titulo} className="aspect-[3/1] w-full object-cover" />}
            <div className="p-5"><h3 className="text-lg font-semibold">{banner.titulo}</h3>{banner.subtitulo && <p className="mt-2 text-sm text-muted-foreground">{banner.subtitulo}</p>}
              {seguro && banner.botao_texto && <Button asChild variant="outline" className="mt-4"><a href={link} target={/^https?:/i.test(link) ? "_blank" : undefined} rel="noopener noreferrer">{banner.botao_texto}<ArrowUpRight /></a></Button>}
            </div>
          </article>;
        })}</div>
      </section>}
    </>
  );
}