import "server-only";
import { prisma } from "./db";
import { SLA_HOURS } from "./constants";
import { triageTicket } from "./ai";

type NewTicket = {
  subject: string;
  description: string;
  customerId?: string | null;
  cameraId?: string | null;
  channel?: string;
  category?: string | null;
  priority?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  authorType?: "CUSTOMER" | "AGENT" | "AI" | "SYSTEM";
  authorId?: string | null;
  aiSummary?: string | null;
  /** Classificar automaticamente com IA quando categoria/prioridade não forem informadas */
  autoTriage?: boolean;
};

export function slaDueAt(priority: string, from = new Date()) {
  return new Date(from.getTime() + (SLA_HOURS[priority] ?? 24) * 3600_000);
}

export async function createTicket(input: NewTicket) {
  let { category, priority, aiSummary } = input;

  if (input.autoTriage !== false && (!category || !priority)) {
    const triage = await triageTicket(input.subject, input.description);
    category = category || triage.category;
    priority = priority || triage.priority;
    aiSummary = aiSummary || triage.summary;
  }
  category ||= "OTHER";
  priority ||= "MEDIUM";

  // Número sequencial do protocolo (retenta em caso de corrida)
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await prisma.ticket.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
    const number = (last?.number ?? 0) + 1;
    try {
      return await prisma.ticket.create({
        data: {
          number,
          subject: input.subject,
          description: input.description,
          customerId: input.customerId || null,
          cameraId: input.cameraId || null,
          channel: input.channel ?? "WEB",
          category,
          priority,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          aiSummary,
          slaDueAt: slaDueAt(priority),
          messages: {
            create: {
              authorType: input.authorType ?? "CUSTOMER",
              authorId: input.authorId ?? null,
              body: input.description,
            },
          },
        },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Não foi possível gerar o número do chamado");
}
