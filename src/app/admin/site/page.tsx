import type { Banner } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { deleteBannerAction, saveBannerAction } from "./actions";

const PLACEMENTS = { HOME: "Site — página inicial", PORTAL: "Portal do cliente" };

function BannerForm({ banner }: { banner?: Banner }) {
  return (
    <form action={saveBannerAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <Field label="Título" className="sm:col-span-2"><input name="title" required defaultValue={banner?.title} className="input" /></Field>
      <Field label="Local"><Select name="placement" options={PLACEMENTS} defaultValue={banner?.placement ?? "HOME"} /></Field>
      <Field label="Ordem"><input name="order" type="number" defaultValue={banner?.order ?? 0} className="input" /></Field>
      <Field label="Subtítulo" className="sm:col-span-2 lg:col-span-4"><input name="subtitle" defaultValue={banner?.subtitle ?? ""} className="input" /></Field>
      <Field label="Texto do botão"><input name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} className="input" /></Field>
      <Field label="Link do botão"><input name="ctaUrl" defaultValue={banner?.ctaUrl ?? ""} className="input" /></Field>
      <Field label="Imagem de fundo (URL)" className="sm:col-span-2"><input name="imageUrl" defaultValue={banner?.imageUrl ?? ""} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={banner?.active ?? true} /> Ativo</label>
      <div className="sm:col-span-2 lg:col-span-3 sm:text-right"><SubmitButton>{banner ? "Salvar" : "Criar banner"}</SubmitButton></div>
    </form>
  );
}

export default async function SiteAdmin() {
  await requireStaff(["ADMIN"]);
  const banners = await prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { order: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Site e banners"
        subtitle="Propaganda institucional. Na página inicial, o primeiro banner (menor ordem) vira o destaque principal; os demais aparecem como campanhas."
        actions={<a href="/" target="_blank" className="btn-outline">Abrir site ↗</a>}
      />
      {banners.map((b) => (
        <Card key={b.id} title={`${b.title}`} actions={
          <form action={deleteBannerAction}><input type="hidden" name="id" value={b.id} /><button className="text-xs text-red-600 hover:underline">excluir</button></form>
        }>
          <BannerForm banner={b} />
        </Card>
      ))}
      <Card title="Novo banner"><BannerForm /></Card>
    </div>
  );
}
