import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contato")({
  validateSearch: z.object({ plano: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Orçamento e contato — Horus Videomonitoramento" },
      { name: "description", content: "Solicite um orçamento de videomonitoramento sem compromisso." },
      { property: "og:title", content: "Solicite seu orçamento — Horus" },
      { property: "og:description", content: "Fale com um consultor Horus e agende uma visita técnica." },
    ],
  }),
  component: Page,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  empresa: z.string().trim().max(120).optional(),
  telefone: z.string().trim().min(8, "Informe um telefone").max(30),
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
  interesse: z.string().trim().max(200).optional(),
  observacoes: z.string().trim().max(1000).optional(),
});

function Page() {
  const { plano } = Route.useSearch();
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados");
      return;
    }
    setLoading(true);
    const v = parsed.data;
    const { error } = await supabase.from("leads").insert({
      nome: v.nome,
      empresa: v.empresa || null,
      telefone: v.telefone,
      email: v.email || null,
      interesse: v.interesse || null,
      observacoes: v.observacoes || null,
      origem: "site",
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    setEnviado(true);
  }

  return (
    <SiteLayout>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-16 lg:grid-cols-2">
        <div>
          <div className="eyebrow">Orçamento</div>
          <h1 className="mt-3 text-4xl font-bold">Vamos proteger o que importa para você</h1>
          <p className="mt-4 text-muted-foreground">
            Preencha o formulário e um consultor entrará em contato para entender sua necessidade e agendar uma visita técnica gratuita.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-card">
          {enviado ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <h2 className="mt-4 text-2xl font-semibold">Recebemos sua solicitação!</h2>
              <p className="mt-2 text-muted-foreground">Em breve um consultor Horus falará com você.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="nome">Nome *</Label><Input id="nome" name="nome" required /></div>
                <div className="space-y-1.5"><Label htmlFor="empresa">Empresa / Condomínio</Label><Input id="empresa" name="empresa" /></div>
                <div className="space-y-1.5"><Label htmlFor="telefone">Telefone / WhatsApp *</Label><Input id="telefone" name="telefone" required /></div>
                <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="interesse">Interesse</Label><Input id="interesse" name="interesse" defaultValue={plano ? `Plano ${plano}` : ""} placeholder="Ex.: 8 câmeras para minha loja" /></div>
              <div className="space-y-1.5"><Label htmlFor="observacoes">Mensagem</Label><Textarea id="observacoes" name="observacoes" rows={4} /></div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Solicitar orçamento"}</Button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
