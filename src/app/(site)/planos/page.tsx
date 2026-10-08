import Link from "next/link";
import { prisma } from "@/lib/db";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planos" };

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { monthlyPrice: "asc" } });
  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="text-center text-3xl font-bold text-horus-900">Planos de videomonitoramento</h1>
      <p className="mx-auto mt-2 max-w-2xl text-center text-slate-500">Todos os planos incluem instalação, suporte técnico e acesso ao portal do cliente.</p>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className={`card flex flex-col p-8 ${p.featured ? "border-2 border-gold-500" : ""}`}>
            {p.featured && <span className="mb-3 self-start rounded-full bg-gold-500 px-3 py-0.5 text-xs font-bold text-horus-950">Mais escolhido</span>}
            <h2 className="text-xl font-bold text-horus-900">{p.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{p.description}</p>
            <div className="mt-4 text-3xl font-extrabold text-horus-900">
              {brl(p.monthlyPrice)}
              <span className="text-sm font-medium text-slate-500">/mês</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              <li>✔ Até {p.cameraLimit} câmeras</li>
              <li>✔ {p.retentionDays} dias de gravação em nuvem</li>
              {p.features?.split("\n").filter(Boolean).map((f) => <li key={f}>✔ {f}</li>)}
            </ul>
            <Link href={`/contato?plano=${encodeURIComponent(p.name)}`} className={p.featured ? "btn-gold mt-6" : "btn-primary mt-6"}>
              Contratar
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
