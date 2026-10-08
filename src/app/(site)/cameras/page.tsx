import { prisma } from "@/lib/db";
import CameraPlayer from "@/components/CameraPlayer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Câmeras ao vivo" };

export default async function PublicCamerasPage() {
  const cameras = await prisma.camera.findMany({ where: { isPublic: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="text-3xl font-bold text-horus-900">Câmeras ao vivo</h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        Acompanhe em tempo real algumas das câmeras abertas monitoradas pela Horus. Clientes acessam suas câmeras privadas pela{" "}
        <a href="/login" className="font-semibold text-gold-600 hover:underline">área do cliente</a>.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {cameras.map((c) => (
          <div key={c.id} className="card overflow-hidden p-3">
            <CameraPlayer streamType={c.streamType} streamUrl={c.streamUrl} thumbnail={c.thumbnail} status={c.status} />
            <div className="px-2 pt-3">
              <h2 className="font-semibold text-horus-900">{c.name}</h2>
              {c.location && <p className="text-sm text-slate-500">📍 {c.location}</p>}
              {c.description && <p className="mt-1 text-sm text-slate-600">{c.description}</p>}
            </div>
          </div>
        ))}
        {cameras.length === 0 && <p className="text-slate-500">Nenhuma câmera pública disponível no momento.</p>}
      </div>
    </div>
  );
}
