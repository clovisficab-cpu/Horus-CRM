import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "admin" | "atendente" | "tecnico" | "cliente";

export async function carregarPapeis(userId: string): Promise<Papel[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as Papel);
}

export const isEquipe = (p: Papel[]) => p.some((r) => r === "admin" || r === "atendente" || r === "tecnico");

export function useSessao() {
  return useQuery({
    queryKey: ["sessao"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return { user: null, papeis: [] as Papel[] };
      return { user: data.user, papeis: await carregarPapeis(data.user.id) };
    },
    staleTime: 60_000,
  });
}
