import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ContratoPortal = Tables<"contratos"> & { planos: { nome: string } | null };

export const portalQuery = (userId: string) => queryOptions({
  queryKey: ["portal", userId],
  queryFn: async () => {
    const vinculos = await supabase.from("cliente_usuarios").select("cliente_id").eq("user_id", userId);
    if (vinculos.error) throw vinculos.error;
    const ids = (vinculos.data ?? []).map((v) => v.cliente_id);
    const banners = supabase.from("banners").select("*").eq("ativo", true).eq("local", "portal").order("ordem");
    if (ids.length === 0) {
      const resultado = await banners;
      if (resultado.error) throw resultado.error;
      return { clientes: [] as Pick<Tables<"clientes">, "id" | "nome">[], cameras: [] as Tables<"cameras">[], contratos: [] as ContratoPortal[], faturas: [] as Tables<"faturas">[], banners: resultado.data ?? [] };
    }
    const [clientes, cameras, contratos, faturas, avisos] = await Promise.all([
      supabase.from("clientes").select("id,nome").in("id", ids).order("nome"),
      supabase.from("cameras").select("*").in("cliente_id", ids).order("nome"),
      supabase.from("contratos").select("*,planos(nome)").in("cliente_id", ids).order("created_at", { ascending: false }),
      supabase.from("faturas").select("*").in("cliente_id", ids).order("vencimento", { ascending: false }),
      banners,
    ]);
    for (const resultado of [clientes, cameras, contratos, faturas, avisos]) {
      if (resultado.error) throw resultado.error;
    }
    return { clientes: clientes.data ?? [], cameras: cameras.data ?? [], contratos: contratos.data ?? [], faturas: faturas.data ?? [], banners: avisos.data ?? [] };
  },
  staleTime: 30_000,
  refetchInterval: 30_000,
});

export function statusFatura(fatura: Pick<Tables<"faturas">, "status" | "vencimento">) {
  const hoje = new Date();
  const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  return fatura.status === "em_aberto" && fatura.vencimento < data ? "vencido" : fatura.status;
}

export function portalHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Portal Horus` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Portal Horus` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] };
}