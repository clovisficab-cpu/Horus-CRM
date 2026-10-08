import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import CameraPlayer from "@/components/CameraPlayer";
import ConfirmButton from "@/components/ConfirmButton";
import CameraForm from "../CameraForm";
import { deleteCameraAction, updateCameraAction } from "../actions";

export default async function CameraDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff();
  const camera = await prisma.camera.findUnique({ where: { id } });
  if (!camera) notFound();
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div>
        <PageHeader title={camera.name} subtitle={camera.location} />
        <Card><CameraForm action={updateCameraAction} camera={camera} customers={customers} /></Card>
        {user.role === "ADMIN" && (
          <form action={deleteCameraAction} className="mt-4">
            <input type="hidden" name="id" value={camera.id} />
            <ConfirmButton message="Excluir esta câmera?">Excluir câmera</ConfirmButton>
          </form>
        )}
      </div>
      <Card title="Pré-visualização">
        <CameraPlayer streamType={camera.streamType} streamUrl={camera.streamUrl} thumbnail={camera.thumbnail} status={camera.status} />
        <p className="mt-3 text-xs text-slate-500">ID para integração de status: <code>{camera.id}</code></p>
      </Card>
    </div>
  );
}
