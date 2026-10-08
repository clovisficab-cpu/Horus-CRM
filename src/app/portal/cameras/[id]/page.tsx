import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CAMERA_STATUS, label } from "@/lib/constants";
import CameraPlayer from "@/components/CameraPlayer";
import { Badge, PageHeader } from "@/components/ui";

export default async function PortalCamera({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireClient();
  const camera = await prisma.camera.findFirst({ where: { id, customerId: user.customerId } });
  if (!camera) notFound();
  return (
    <div>
      <PageHeader
        title={camera.name}
        subtitle={camera.location}
        actions={
          <>
            <Badge value={camera.status}>{label(CAMERA_STATUS, camera.status)}</Badge>
            <Link href={`/portal/chamados/novo?camera=${camera.id}&categoria=FOOTAGE_REQUEST`} className="btn-outline">Solicitar gravação</Link>
            <Link href={`/portal/chamados/novo?camera=${camera.id}`} className="btn-gold">Reportar problema</Link>
          </>
        }
      />
      <div className="card p-3">
        <CameraPlayer streamType={camera.streamType} streamUrl={camera.streamUrl} thumbnail={camera.thumbnail} status={camera.status} />
      </div>
    </div>
  );
}
