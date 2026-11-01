import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { PlanosGrid } from "@/components/PlanosGrid";
import { planosQuery } from "@/lib/public-data";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Horus Videomonitoramento" },
      { name: "description", content: "Planos de videomonitoramento Residencial, Empresarial e Condomínio." },
      { property: "og:title", content: "Planos — Horus" },
      { property: "og:description", content: "Compare os planos de videomonitoramento da Horus." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(planosQuery),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(planosQuery);
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 pt-16">
        <div className="eyebrow">Planos</div>
        <h1 className="mb-12 mt-3 text-4xl font-bold">Proteção sob medida para você</h1>
        <PlanosGrid planos={data} />
      </section>
    </SiteLayout>
  );
}
