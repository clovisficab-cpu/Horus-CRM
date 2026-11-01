import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const planosQuery = queryOptions({
  queryKey: ["public", "planos"],
  queryFn: async () => {
    const { data, error } = await supabase.from("planos").select("*").eq("ativo", true).order("mensalidade");
    if (error) throw error;
    return data;
  },
});

export const bannersSiteQuery = queryOptions({
  queryKey: ["public", "banners", "site"],
  queryFn: async () => {
    const { data, error } = await supabase.from("banners").select("*").eq("ativo", true).eq("local", "site").order("ordem");
    if (error) throw error;
    return data;
  },
});

export const camerasPublicasQuery = queryOptions({
  queryKey: ["public", "cameras"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("cameras")
      .select("id,nome,local,tipo_stream,stream_url,imagem_capa,status")
      .eq("publica", true)
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
