import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TICKET_CATEGORIES } from "@/lib/constants";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { openTicketAction } from "../../actions";

export default async function NewPortalTicket({ searchParams }: { searchParams: Promise<{ camera?: string; categoria?: string; erro?: string }> }) {
  const sp = await searchParams;
  const user = await requireClient();
  const cameras = await prisma.camera.findMany({ where: { customerId: user.customerId }, orderBy: { name: "asc" } });
  return (
    <div className="max-w-2xl">
      <PageHeader title="Abrir chamado" subtitle="Descreva o problema com o máximo de detalhes. Nossa IA classifica e prioriza automaticamente." />
      <Card>
        <form action={openTicketAction} className="grid gap-4">
          {sp.erro && <p className="rounded bg-red-50 p-2 text-sm text-red-700">Preencha assunto e descrição.</p>}
          <Field label="Assunto *"><input name="subject" required maxLength={200} className="input" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Câmera relacionada">
              <Select name="cameraId" options={cameras.map((c) => [c.id, c.name] as [string, string])} defaultValue={sp.camera} includeEmpty="Nenhuma / várias" />
            </Field>
            <Field label="Tipo">
              <Select name="category" options={TICKET_CATEGORIES} defaultValue={sp.categoria} includeEmpty="Não sei (classificar automaticamente)" />
            </Field>
          </div>
          <Field label="Descrição *">
            <textarea
              name="description"
              required
              rows={6}
              className="input"
              placeholder={sp.categoria === "FOOTAGE_REQUEST" ? "Informe data, horário aproximado e o que aconteceu." : "O que está acontecendo? Desde quando?"}
            />
          </Field>
          <SubmitButton className="btn-gold" pendingText="Enviando...">Abrir chamado</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
