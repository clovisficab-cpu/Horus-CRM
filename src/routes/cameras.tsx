import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { CameraPlayer } from "@/components/CameraPlayer";
import { camerasPublicasQuery } from "@/lib/public-data";

export const Route = createFileRoute("/cameras")({
  head: () => ({
    meta: [
      { title: "Câmeras ao vivo — Horus Videomonitoramento" },
      { name: "description", content: "Veja ao vivo câmeras de demonstração monitoradas pela Horus." },
      { property: "og:title", content: "Câmeras ao vivo — Horus" },
      { property: "og:description", content: "Vitrine de câmeras ao vivo da Horus Videomonitoramento." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(camerasPublicasQuery),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(camerasPublicasQuery);
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 pt-16">
        <div className="eyebrow">Vitrine</div>
        <h1 className="mt-3 text-4xl font-bold">Câmeras ao vivo</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Uma amostra da qualidade de imagem que entregamos aos nossos clientes.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {data.map((c) => <CameraPlayer key={c.id} camera={c} />)}
        </div>
        {data.length === 0 && <p className="mt-10 text-muted-foreground">Nenhuma câmera pública no momento.</p>}
      </section>
    </SiteLayout>
  );
}
