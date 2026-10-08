import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";

export default async function PortalHelp() {
  const articles = await prisma.knowledgeArticle.findMany({ where: { published: true }, orderBy: { createdAt: "asc" } });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Central de ajuda" subtitle="Perguntas frequentes. Não encontrou? Abra um chamado ou fale no WhatsApp." />
      <div className="space-y-3">
        {articles.map((a) => (
          <details key={a.id} className="card p-4">
            <summary className="cursor-pointer font-semibold text-horus-900">{a.question}</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{a.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
