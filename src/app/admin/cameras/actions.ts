"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

function cameraData(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
  return {
    name: String(fd.get("name") ?? "").trim(),
    location: s("location"),
    description: s("description"),
    customerId: s("customerId"),
    streamType: s("streamType") ?? "HLS",
    streamUrl: s("streamUrl"),
    thumbnail: s("thumbnail"),
    isPublic: fd.get("isPublic") === "on",
    status: s("status") ?? "ONLINE",
    brand: s("brand"),
    ipAddress: s("ipAddress"),
  };
}

export async function createCameraAction(fd: FormData) {
  await requireStaff();
  const data = cameraData(fd);
  if (!data.name) redirect("/admin/cameras/nova");
  const cam = await prisma.camera.create({ data });
  redirect(`/admin/cameras/${cam.id}`);
}

export async function updateCameraAction(fd: FormData) {
  await requireStaff();
  const id = String(fd.get("id"));
  await prisma.camera.update({ where: { id }, data: cameraData(fd) });
  revalidatePath(`/admin/cameras/${id}`);
}

export async function deleteCameraAction(fd: FormData) {
  await requireStaff(["ADMIN"]);
  await prisma.camera.delete({ where: { id: String(fd.get("id")) } });
  redirect("/admin/cameras");
}
