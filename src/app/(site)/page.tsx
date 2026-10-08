import Link from "next/link";
import { prisma } from "@/lib/db";
import { brl } from "@/lib/format";
import CameraPlayer from "@/components/CameraPlayer";

export const dynamic = "force-dynamic";

const SERVICES = [
  { icon: "🎥", title: "Monitoramento 24h", text: "Central de monitoramento acompanhando suas câmeras dia e noite, com alertas em tempo real." },
  { icon: "☁️", title: "Gravação em nuvem", text: "Imagens armazenadas com segurança e acessíveis de qualquer lugar pelo portal ou aplicativo." },
  { icon: "🏢", title: "Condomínios e empresas", text: "Projetos sob medida para portarias, áreas comuns, galpões, lojas e escritórios." },
  { icon: "🛠️", title: "Instalação e manutenção", text: "Equipe técnica própria para instalação, manutenção preventiva e corretiva." },
  { icon: "🤖", title: "Atendimento com IA", text: "Abra chamados pelo WhatsApp a qualquer hora com nossa assistente virtual inteligente." },
  { icon: "📱", title: "Acesso pelo celular", text: "Veja suas câmeras ao vivo, solicite gravações e acompanhe seus chamados online." },
];

export default async function HomePage() {
  const [banners, plans, cameras] = await Promise.all([
    prisma.banner.findMany({ where: { active: true, placement: "HOME" }, orderBy: { order: "asc" } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { monthlyPrice: "asc" }, take: 3 }),
    prisma.camera.findMany({ where: { isPublic: true }, take: 2, orderBy: { name: "asc" } }),
  ]);
  const hero = banners[0];
  const promos = banners.slice(1);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-horus-950 text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: hero?.imageUrl ? `url(${hero.imageUrl})` : "radial-gradient(circle at 70% 30%, #1c3266 0, transparent 60%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="rounded-full border border-gold-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">
              Videomonitoramento inteligente
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
              {hero?.title ?? "O olho que protege o que importa para você"}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              {hero?.subtitle ?? "Câmeras, monitoramento 24 horas e suporte rápido para residências, condomínios e empresas."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={hero?.ctaUrl ?? "/contato"} className="btn-gold px-6 py-3 text-base">
                {hero?.ctaLabel ?? "Solicitar orçamento"}
              </Link>
              <Link href="/cameras" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">
                Ver câmeras ao vivo
              </Link>
            </div>
          </div>
          {cameras[0] && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl">
              <CameraPlayer streamType={cameras[0].streamType} streamUrl={cameras[0].streamUrl} thumbnail={cameras[0].thumbnail} status={cameras[0].status} title={cameras[0].name} />
            </div>
          )}
        </div>
      </section>

      {/* Campanhas / propaganda institucional */}
      {promos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2">
            {promos.map((b) => (
              <div key={b.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-horus-800 to-horus-950 p-8 text-white">
                {b.imageUrl && <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${b.imageUrl})`, backgroundSize: "cover" }} />}
                <div className="relative">
                  <h3 className="text-2xl font-bold">{b.title}</h3>
                  {b.subtitle && <p className="mt-2 text-slate-300">{b.subtitle}</p>}
                  {b.ctaUrl && (
                    <Link href={b.ctaUrl} className="btn-gold mt-5">
                      {b.ctaLabel ?? "Saiba mais"}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Serviços */}
      <section id="servicos" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold text-horus-900">Soluções completas em segurança</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500">Da instalação ao monitoramento, cuidamos de tudo para você ter tranquilidade.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="card p-6">
                <div className="text-3xl">{s.icon}</div>
                <h3 className="mt-3 text-lg font-semibold text-horus-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      {plans.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-3xl font-bold text-horus-900">Planos</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} className={`card flex flex-col p-8 ${p.featured ? "border-2 border-gold-500" : ""}`}>
                  <h3 className="text-xl font-bold text-horus-900">{p.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{p.description}</p>
                  <div className="mt-4 text-3xl font-extrabold text-horus-900">
                    {brl(p.monthlyPrice)}
                    <span className="text-sm font-medium text-slate-500">/mês</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    <li>✔ Até {p.cameraLimit} câmeras</li>
                    <li>✔ {p.retentionDays} dias de gravação</li>
                    {p.features?.split("\n").filter(Boolean).map((f) => <li key={f}>✔ {f}</li>)}
                  </ul>
                  <Link href={`/contato?plano=${encodeURIComponent(p.name)}`} className={p.featured ? "btn-gold mt-6" : "btn-primary mt-6"}>
                    Contratar
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gold-500 py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4">
          <div>
            <h2 className="text-2xl font-bold text-horus-950">Pronto para proteger seu patrimônio?</h2>
            <p className="text-horus-900">Fale com um especialista e receba um projeto sem compromisso.</p>
          </div>
          <Link href="/contato" className="btn bg-horus-950 px-6 py-3 text-white hover:bg-horus-800">
            Quero um orçamento
          </Link>
        </div>
      </section>
    </>
  );
}
