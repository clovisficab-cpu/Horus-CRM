import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import CameraForm from "../CameraForm";
import { createCameraAction } from "../actions";

export default async function NewCamera({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const sp = await searchParams;
  await requireStaff();
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Nova câmera" />
      <Card><CameraForm action={createCameraAction} customers={customers} camera={{ customerId: sp.customer }} /></Card>
    </div>
  );
}
