"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

const STAFF = ["ADMIN", "AGENT"];

export async function createContractAction(fd: FormData) {
  await requireStaff(STAFF);
  const customerId = String(fd.get("customerId"));
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: String(fd.get("planId")) } });
  const value = Number(fd.get("monthlyValue"));
  const dueDay = Math.min(28, Math.max(1, Number(fd.get("dueDay")) || 10));
  await prisma.contract.create({
    data: { customerId, planId: plan.id, monthlyValue: value > 0 ? value : plan.monthlyPrice, dueDay },
  });
  await prisma.activity.create({ data: { customerId, type: "SYSTEM", description: `Contrato do plano ${plan.name} criado` } });
  revalidatePath(`/admin/clientes/${customerId}`);
}

export async function setContractStatusAction(fd: FormData) {
  await requireStaff(STAFF);
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  await prisma.contract.update({ where: { id }, data: { status, endDate: status === "CANCELLED" ? new Date() : null } });
  revalidatePath("/admin/financeiro");
}

/** Gera as faturas do mês de referência (AAAA-MM) para todos os contratos ativos, sem duplicar */
export async function generateInvoicesAction(fd: FormData) {
  await requireStaff(STAFF);
  const ref = String(fd.get("reference") || new Date().toISOString().slice(0, 7));
  const [year, month] = ref.split("-").map(Number);
  const contracts = await prisma.contract.findMany({ where: { status: "ACTIVE" } });
  for (const c of contracts) {
    const exists = await prisma.invoice.findFirst({ where: { contractId: c.id, reference: ref } });
    if (exists) continue;
    await prisma.invoice.create({
      data: {
        customerId: c.customerId,
        contractId: c.id,
        reference: ref,
        amount: c.monthlyValue,
        dueDate: new Date(year, month - 1, c.dueDay, 12),
      },
    });
  }
  revalidatePath("/admin/financeiro");
}

/** Marca como vencidas as faturas em aberto com vencimento passado */
export async function refreshOverdueAction() {
  await requireStaff(STAFF);
  await prisma.invoice.updateMany({ where: { status: "OPEN", dueDate: { lt: new Date() } }, data: { status: "OVERDUE" } });
  revalidatePath("/admin/financeiro");
}

export async function setInvoiceStatusAction(fd: FormData) {
  await requireStaff(STAFF);
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  await prisma.invoice.update({ where: { id }, data: { status, paidAt: status === "PAID" ? new Date() : null } });
  revalidatePath("/admin/financeiro");
}
