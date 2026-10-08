import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createTicket } from "@/lib/tickets";

/**
 * Recebe o status das câmeras a partir do servidor de mídia/NVR ou de um script de monitoramento.
 * POST { cameraId, status: "ONLINE" | "OFFLINE" } com o cabeçalho x-api-key = CAMERA_WEBHOOK_TOKEN.
 * Quando uma câmera de cliente fica OFFLINE, um chamado é aberto automaticamente.
 */
export async function POST(req: NextRequest) {
  const token = process.env.CAMERA_WEBHOOK_TOKEN;
  if (!token || req.headers.get("x-api-key") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { cameraId?: string; status?: string } | null;
  if (!body?.cameraId || !["ONLINE", "OFFLINE"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "cameraId e status (ONLINE|OFFLINE) são obrigatórios" }, { status: 400 });
  }

  const camera = await prisma.camera.findUnique({ where: { id: body.cameraId } });
  if (!camera) return NextResponse.json({ error: "câmera não encontrada" }, { status: 404 });
  if (camera.status === "MAINTENANCE") return NextResponse.json({ ok: true, ignored: "em manutenção" });

  await prisma.camera.update({
    where: { id: camera.id },
    data: { status: body.status, lastSeenAt: body.status === "ONLINE" ? new Date() : undefined },
  });

  let ticketNumber: number | null = null;
  if (body.status === "OFFLINE" && camera.status !== "OFFLINE" && camera.customerId) {
    const open = await prisma.ticket.findFirst({
      where: { cameraId: camera.id, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } },
    });
    if (!open) {
      const ticket = await createTicket({
        subject: `Câmera offline: ${camera.name}`,
        description: `O monitoramento detectou que a câmera "${camera.name}"${camera.location ? ` (${camera.location})` : ""} ficou offline.`,
        customerId: camera.customerId,
        cameraId: camera.id,
        channel: "MONITOR",
        category: "CAMERA_OFFLINE",
        priority: "HIGH",
        authorType: "SYSTEM",
        autoTriage: false,
      });
      ticketNumber = ticket.number;
    }
  }
  return NextResponse.json({ ok: true, ticketNumber });
}
