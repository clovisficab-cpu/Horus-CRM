export const categoriasIA = ["camera_offline", "qualidade_imagem", "solicitacao_gravacao", "acesso", "financeiro", "instalacao", "manutencao", "outros"] as const;
export const prioridadesIA = ["baixa", "media", "alta", "urgente"] as const;

export function resultadoTriagem(informado: { categoria?: string | null; prioridade?: string | null }, ia?: { categoria: string; prioridade: string; resumo: string }) {
  return {
    categoria: informado.categoria || (ia && categoriasIA.some((c) => c === ia.categoria) ? ia.categoria : "outros"),
    prioridade: informado.prioridade || (ia && prioridadesIA.some((p) => p === ia.prioridade) ? ia.prioridade : "media"),
    resumo_ia: ia?.resumo.trim().slice(0, 500) || null,
  };
}

export function conversaPublica<T extends { nota_interna: boolean }>(mensagens: T[]) {
  return mensagens.filter((m) => !m.nota_interna);
}