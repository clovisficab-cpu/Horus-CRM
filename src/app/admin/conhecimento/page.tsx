import type { KnowledgeArticle } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Field, PageHeader } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { deleteArticleAction, saveArticleAction } from "./actions";

function ArticleForm({ a }: { a?: KnowledgeArticle }) {
  return (
    <form action={saveArticleAction} className="grid gap-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field label="Pergunta"><input name="question" required defaultValue={a?.question} className="input" /></Field>
      <Field label="Resposta"><textarea name="answer" required rows={3} defaultValue={a?.answer} className="input" /></Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <input name="category" placeholder="Categoria" defaultValue={a?.category ?? ""} className="input w-48" />
          <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={a?.published ?? true} /> Publicado</label>
        </div>
        <SubmitButton>{a ? "Salvar" : "Adicionar"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function KnowledgePage() {
  await requireStaff(["ADMIN", "AGENT"]);
  const articles = await prisma.knowledgeArticle.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Base de conhecimento" subtitle="Usada pela IA no WhatsApp e nas sugestões de resposta, e exibida na central de ajuda do portal." />
      <Card title="Nova pergunta"><ArticleForm /></Card>
      {articles.map((a) => (
        <Card key={a.id} actions={<form action={deleteArticleAction}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-red-600 hover:underline">excluir</button></form>}>
          <ArticleForm a={a} />
        </Card>
      ))}
    </div>
  );
}
