import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Empty, Field, PageHeader, Pill, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/banners")({ head: () => equipeHead("Site e banners", "Área de avisos e banners da Horus Videomonitoramento."), component: P });

type Banner = Tables<"banners">;

function P() {
  const { isAdmin } = Route.useRouteContext();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Banner | "novo" | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("local").order("ordem")).data ?? [],
  });
  if (!isAdmin) return <Empty>Apenas administradores.</Empty>;
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["admin", "banners"] }); qc.invalidateQueries({ queryKey: ["public", "banners"] }); };

  async function toggle(b: Banner) {
    const { error } = await supabase.from("banners").update({ ativo: !b.ativo }).eq("id", b.id);
    if (error) return void toast.error(error.message);
    recarregar();
  }
  async function excluir(b: Banner) {
    if (!confirm(`Excluir o banner "${b.titulo}"?`)) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) return void toast.error(error.message);
    toast.success("Banner excluído");
    recarregar();
  }

  return (
    <>
      <PageHeader title="Site e banners" actions={<Button variant="hero" onClick={() => setEdit("novo")}><Plus /> Novo banner</Button>} />
      {data.length === 0 ? <Empty>Nenhum banner.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Título</th><th className="p-3">Local</th><th className="p-3">Ordem</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-card/60" onClick={() => setEdit(b)}>
                  <td className="p-3"><div className="font-medium">{b.titulo}</div><div className="text-xs text-muted-foreground">{b.subtitulo}</div></td>
                  <td className="p-3">{b.local === "portal" ? "Portal" : "Site"}</td>
                  <td className="p-3">{b.ordem}</td>
                  <td className="p-3">{b.ativo ? <Pill tone="success">Ativo</Pill> : <Pill>Inativo</Pill>}</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggle(b)}>{b.ativo ? "Desativar" : "Ativar"}</Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => excluir(b)} aria-label="Excluir"><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit === "novo" ? "Novo banner" : "Editar banner"}</DialogTitle></DialogHeader>
          {edit && <BannerForm banner={edit === "novo" ? undefined : edit} onSaved={() => { setEdit(null); recarregar(); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BannerForm({ banner: b, onSaved }: { banner?: Banner | undefined; onSaved: () => void }) {
  const [f, setF] = useState({
    titulo: b?.titulo ?? "", subtitulo: b?.subtitulo ?? "", botao_texto: b?.botao_texto ?? "", botao_link: b?.botao_link ?? "",
    imagem_url: b?.imagem_url ?? "", local: b?.local ?? "site", ordem: b?.ordem?.toString() ?? "0", ativo: b?.ativo ?? true,
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      titulo: f.titulo.trim(), subtitulo: f.subtitulo || null, botao_texto: f.botao_texto || null, botao_link: f.botao_link || null,
      imagem_url: f.imagem_url || null, local: f.local, ordem: Number(f.ordem) || 0, ativo: f.ativo,
    };
    setLoading(true);
    const { error } = b ? await supabase.from("banners").update(payload).eq("id", b.id) : await supabase.from("banners").insert(payload);
    setLoading(false);
    if (error) return void toast.error(error.message);
    toast.success("Banner salvo");
    onSaved();
  }

  return (
    <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
      <Field label="Título *" className="sm:col-span-2"><Input value={f.titulo} onChange={set("titulo")} required /></Field>
      <Field label="Subtítulo" className="sm:col-span-2"><Input value={f.subtitulo} onChange={set("subtitulo")} /></Field>
      <Field label="Texto do botão"><Input value={f.botao_texto} onChange={set("botao_texto")} /></Field>
      <Field label="Link do botão"><Input value={f.botao_link} onChange={set("botao_link")} /></Field>
      <Field label="Imagem (URL)" className="sm:col-span-2"><Input value={f.imagem_url} onChange={set("imagem_url")} /></Field>
      <Field label="Local">
        <select className={selectCls} value={f.local} onChange={set("local")}><option value="site">Site</option><option value="portal">Portal do cliente</option></select>
      </Field>
      <Field label="Ordem"><Input type="number" value={f.ordem} onChange={set("ordem")} /></Field>
      <Field label="Ativo">
        <select className={selectCls} value={f.ativo ? "1" : "0"} onChange={(e) => setF({ ...f, ativo: e.target.value === "1" })}><option value="1">Sim</option><option value="0">Não</option></select>
      </Field>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="hero" disabled={loading}>{loading ? "Salvando..." : "Salvar banner"}</Button></div>
    </form>
  );
}
