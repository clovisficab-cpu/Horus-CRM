import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TICKET_CATEGORIES, TICKET_CHANNELS, TICKET_PRIORITIES } from "@/lib/constants";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { createTicketAction } from "../actions";

export default async function NewTicket({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const sp = await searchParams;
  await requireStaff();
  const [customers, staff, cameras] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: { not: "CLIENT" }, active: true }, orderBy: { name: "asc" } }),
    prisma.camera.findMany({ where: { customerId: { not: null } }, include: { customer: { select: { name: true } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo chamado" subtitle="Categoria e prioridade em branco são definidas automaticamente pela IA." />
      <Card>
        <form action={createTicketAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Assunto *" className="sm:col-span-2"><input name="subject" required className="input" /></Field>
          <Field label="Cliente"><Select name="customerId" options={customers.map((c) => [c.id, c.name] as [string, string])} defaultValue={sp.customer} includeEmpty="— não cadastrado —" /></Field>
          <Field label="Câmera"><Select name="cameraId" options={cameras.map((c) => [c.id, `${c.customer?.name} · ${c.name}`] as [string, string])} includeEmpty="—" /></Field>
          <Field label="Contato (nome)"><input name="contactName" className="input" /></Field>
          <Field label="Contato (telefone/WhatsApp)"><input name="contactPhone" className="input" /></Field>
          <Field label="Canal"><Select name="channel" options={TICKET_CHANNELS} defaultValue="PHONE" /></Field>
          <Field label="Responsável"><Select name="assigneeId" options={staff.map((u) => [u.id, u.name] as [string, string])} includeEmpty="— fila —" /></Field>
          <Field label="Categoria"><Select name="category" options={TICKET_CATEGORIES} includeEmpty="Automática (IA)" /></Field>
          <Field label="Prioridade"><Select name="priority" options={TICKET_PRIORITIES} includeEmpty="Automática (IA)" /></Field>
          <Field label="Descrição *" className="sm:col-span-2"><textarea name="description" rows={6} required className="input" /></Field>
          <div className="sm:col-span-2"><SubmitButton pendingText="Criando...">Criar chamado</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
