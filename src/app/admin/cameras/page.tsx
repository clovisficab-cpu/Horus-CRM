import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { CAMERA_STATUS, STREAM_TYPES, label } from "@/lib/constants";
import { Badge, Empty, PageHeader, Select } from "@/components/ui";

export default async function CamerasPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  await requireStaff();
  const cameras = await prisma.camera.findMany({
    where: {
      ...(sp.status ? { status: sp.status } : {}),
      ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { location: { contains: sp.q, mode: "insensitive" } }, { customer: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    },
    orderBy: [{ status: "desc" }, { name: "asc" }],
    include: { customer: { select: { id: true, name: true } } },
  });
  return (
    <div>
      <PageHeader title="Câmeras" subtitle={`${cameras.length} câmera(s)`} actions={<Link href="/admin/cameras/nova" className="btn-gold">Nova câmera</Link>} />
      <form className="card mb-4 flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={sp.q} placeholder="Buscar câmera, local ou cliente" className="input max-w-md" />
        <div className="w-44"><Select name="status" options={CAMERA_STATUS} defaultValue={sp.status} includeEmpty="Todos os status" /></div>
        <button className="btn-primary">Filtrar</button>
      </form>
      {cameras.length === 0 ? <Empty>Nenhuma câmera.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Câmera</th><th>Cliente</th><th>Stream</th><th>Vitrine</th><th>Último sinal</th><th>Status</th></tr></thead>
            <tbody>
              {cameras.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/cameras/${c.id}`} className="font-medium text-horus-900 hover:text-gold-600">{c.name}</Link><div className="text-xs text-slate-500">{c.location}</div></td>
                  <td>{c.customer ? <Link href={`/admin/clientes/${c.customer.id}`} className="hover:text-gold-600">{c.customer.name}</Link> : <span className="text-slate-400">Horus</span>}</td>
                  <td className="text-xs">{label(STREAM_TYPES, c.streamType)}</td>
                  <td>{c.isPublic ? <Badge tone="gold">pública</Badge> : "—"}</td>
                  <td className="text-xs text-slate-500">{dateTime(c.lastSeenAt)}</td>
                  <td><Badge value={c.status}>{label(CAMERA_STATUS, c.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
