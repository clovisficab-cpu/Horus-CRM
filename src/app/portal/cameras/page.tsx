import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CAMERA_STATUS, label } from "@/lib/constants";
import CameraPlayer from "@/components/CameraPlayer";
import { Badge, Empty, PageHeader } from "@/components/ui";

export default async function PortalCameras() {
  const user = await requireClient();
  const cameras = await prisma.camera.findMany({ where: { customerId: user.customerId }, orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="Minhas câmeras" subtitle="Visualização ao vivo das câmeras do seu contrato" />
      {cameras.length === 0 ? (
        <Empty>Nenhuma câmera vinculada ao seu cadastro.</Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cameras.map((c) => (
            <div key={c.id} className="card p-3">
              <CameraPlayer streamType={c.streamType} streamUrl={c.streamUrl} thumbnail={c.thumbnail} status={c.status} autoPlay={false} />
              <div className="flex items-center justify-between px-1 pt-3">
                <div>
                  <Link href={`/portal/cameras/${c.id}`} className="font-semibold text-horus-900 hover:text-gold-600">{c.name}</Link>
                  {c.location && <p className="text-xs text-slate-500">{c.location}</p>}
                </div>
                <Badge value={c.status}>{label(CAMERA_STATUS, c.status)}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
