import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Cloud, Headset, MessageCircle, ShieldCheck, Smartphone, Wrench } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { CameraPlayer } from "@/components/CameraPlayer";
import { PlanosGrid } from "@/components/PlanosGrid";
import { Button } from "@/components/ui/button";
import { bannersSiteQuery, camerasPublicasQuery, planosQuery } from "@/lib/public-data";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Horus Videomonitoramento — O olho que protege o que importa" },
      { name: "description", content: "Câmeras de segurança com monitoramento 24h, gravação em nuvem e acesso pelo celular para residências, condomínios e empresas." },
      { property: "og:title", content: "Horus Videomonitoramento" },
      { property: "og:description", content: "Monitoramento 24h, gravação em nuvem e atendimento com IA via WhatsApp." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(bannersSiteQuery),
      context.queryClient.ensureQueryData(camerasPublicasQuery),
      context.queryClient.ensureQueryData(planosQuery),
    ]),
  component: Home,
});

const SERVICOS = [
  { icon: ShieldCheck, t: "Monitoramento 24h", d: "Central de operadores atenta a cada evento, dia e noite." },
  { icon: Cloud, t: "Gravação em nuvem", d: "Imagens seguras fora do local, disponíveis quando você precisar." },
  { icon: Building2, t: "Condomínios e empresas", d: "Projetos sob medida para portarias, garagens e áreas comuns." },
  { icon: Wrench, t: "Instalação e manutenção", d: "Equipe técnica própria e manutenção preventiva." },
  { icon: MessageCircle, t: "Atendimento com IA via WhatsApp", d: "Respostas imediatas e abertura de chamados a qualquer hora." },
  { icon: Smartphone, t: "Acesso pelo celular", d: "Veja suas câmeras ao vivo de onde estiver." },
];

function Home() {
  const { data: banners } = useSuspenseQuery(bannersSiteQuery);
  const { data: cameras } = useSuspenseQuery(camerasPublicasQuery);
  const { data: planos } = useSuspenseQuery(planosQuery);
  const [principal, ...campanhas] = banners;
  const titulo = principal?.titulo ?? "O olho que protege o que importa para você";

  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <img src={principal?.imagem_url || hero} alt="" className="absolute inset-0 h-full w-full object-cover" width={1600} height={912} />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <div className="eyebrow">Videomonitoramento inteligente</div>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">{titulo}</h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {principal?.subtitulo ?? "Monitoramento 24 horas para residências, condomínios e empresas."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <a href={principal?.botao_link || "/contato"}>{principal?.botao_texto || "Solicitar orçamento"} <ArrowRight /></a>
              </Button>
              <Button asChild variant="gold" size="lg">
                <Link to="/cameras">Ver câmeras ao vivo</Link>
              </Button>
            </div>
          </div>
          {cameras[0] && <CameraPlayer camera={cameras[0]} className="shadow-gold" />}
        </div>
      </section>

      {campanhas.length > 0 && (
        <section className="mx-auto mt-16 grid max-w-7xl gap-6 px-5 md:grid-cols-2">
          {campanhas.map((b) => (
            <a key={b.id} href={b.botao_link || "/contato"} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/50">
              {b.imagem_url && <img src={b.imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" loading="lazy" />}
              <div className="relative">
                <div className="eyebrow">Campanha</div>
                <h3 className="mt-2 text-2xl font-semibold">{b.titulo}</h3>
                <p className="mt-2 text-muted-foreground">{b.subtitulo}</p>
                {b.botao_texto && (
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {b.botao_texto} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </div>
            </a>
          ))}
        </section>
      )}

      <section className="mx-auto mt-24 max-w-7xl px-5">
        <div className="eyebrow">Serviços</div>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Segurança completa, do projeto ao atendimento</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICOS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-5">
        <div className="eyebrow">Planos</div>
        <h2 className="mb-10 mt-3 text-3xl font-bold md:text-4xl">Escolha a proteção ideal</h2>
        <PlanosGrid planos={planos} />
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-5">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-primary/30 bg-navy p-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold">Peça seu orçamento sem compromisso</h2>
            <p className="mt-2 text-muted-foreground">Um consultor Horus entra em contato e agenda uma visita técnica gratuita.</p>
          </div>
          <Button asChild variant="hero" size="lg">
            <Link to="/contato"><Headset /> Solicitar orçamento</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
