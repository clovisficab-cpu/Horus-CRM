import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl } from "@/lib/format";
import { LEAD_SOURCES, LEAD_STAGES, label } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { moveLeadAction } from "./actions";

const STAGES = Object.keys(LEAD_STAGES);

export default async function LeadsBoard({ searchParams }: { searchParams: Promise<{ closed?: string }> }) {
  const sp = await searchParams;
  await requireStaff(["ADMIN", "AGENT"]);
  const stages = sp.closed ? STAGES : STAGES.filter((s) => !["WON", "LOST"].includes(s));
  const leads = await prisma.lead.findMany({
    where: { stage: { in: stages } },
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Funil de vendas"
        subtitle="Leads do site, WhatsApp e indicações"
        actions={
          <>
            <Link href={sp.closed ? "/admin/leads" : "/admin/leads?closed=1"} className="btn-outline">{sp.closed ? "Ocultar ganhos/perdidos" : "Mostrar ganhos/perdidos"}</Link>
            <Link href="/admin/leads/novo" className="btn-gold">Novo lead</Link>
          </>
        }
      />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          const idx = STAGES.indexOf(stage);
          return (
            <div key={stage} className="w-72 shrink-0 rounded-xl bg-slate-100 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-horus-900">{label(LEAD_STAGES, stage)}</h2>
                <span className="text-xs text-slate-500">{items.length} · {brl(items.reduce((s, l) => s + (l.value ?? 0), 0))}</span>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <div key={l.id} className="card p-3">
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-horus-900 hover:text-gold-600">{l.name}</Link>
                    {l.company && <div className="text-xs text-slate-500">{l.company}</div>}
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">
                      <span>{label(LEAD_SOURCES, l.source)}</span>
                      {l.value && <span>· {brl(l.value)}/mês</span>}
                      {l.owner && <span>· {l.owner.name.split(" ")[0]}</span>}
                    </div>
                    <form action={moveLeadAction} className="mt-2 flex justify-between">
                      <input type="hidden" name="id" value={l.id} />
                      {idx > 0 ? <button name="stage" value={STAGES[idx - 1]} className="text-xs text-slate-500 hover:text-horus-900">← voltar</button> : <span />}
                      {idx < STAGES.length - 2 ? (
                        <button name="stage" value={STAGES[idx + 1]} className="text-xs font-semibold text-gold-600 hover:underline">avançar →</button>
                      ) : stage === "WON" || stage === "LOST" ? <span /> : null}
                    </form>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
