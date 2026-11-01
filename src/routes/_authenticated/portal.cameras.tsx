import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CameraPlayer } from "@/components/CameraPlayer";
import { PageHeader, Empty, Pill, toneStatus } from "@/components/kit";
import { STATUS_CAMERA } from "@/lib/format";
import { portalHead, portalQuery } from "@/lib/portal-data";

export const Route = createFileRoute("/_authenticated/portal/cameras")({
  head: () => portalHead("Minhas câmeras", "Transmissões ao vivo e status das câmeras vinculadas ao seu cadastro Horus."),
  loader: ({ context }) => context.queryClient.ensureQueryData(portalQuery(context.user.id)),
  component: PortalCameras,
});

function PortalCameras() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(portalQuery(user.id));
  return <>
    <PageHeader title="Minhas câmeras" subtitle={`${data.cameras.filter((c) => c.status === "online").length} online · ${data.cameras.length} no total`} />
    {data.cameras.length === 0 ? <Empty>Nenhuma câmera vinculada ao seu cadastro.</Empty> :
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.cameras.map((camera) => <article key={camera.id}>
        <CameraPlayer camera={camera} />
        <div className="mt-3 flex items-center justify-between gap-3"><h2 className="min-w-0 break-words text-sm font-semibold">{camera.nome}</h2><Pill tone={toneStatus[camera.status]}>{STATUS_CAMERA[camera.status] ?? camera.status}</Pill></div>
      </article>)}</div>}
  </>;
}