import { describe, expect, it } from "vitest";
import { conversaPublica, resultadoTriagem } from "@/lib/chamados-ia-rules";

describe("Regras da IA nos chamados", () => {
  it("usa outros e média se a IA falhar e nada foi informado", () => {
    expect(resultadoTriagem({})).toEqual({ categoria: "outros", prioridade: "media", resumo_ia: null });
  });
  it("preserva categoria e prioridade informadas mesmo quando a IA sugere outras", () => {
    expect(resultadoTriagem({ categoria: "acesso", prioridade: "baixa" }, { categoria: "camera_offline", prioridade: "alta", resumo: "Falha de acesso" })).toEqual({ categoria: "acesso", prioridade: "baixa", resumo_ia: "Falha de acesso" });
  });
  it("preenche somente os campos não informados", () => {
    expect(resultadoTriagem({ categoria: "acesso" }, { categoria: "camera_offline", prioridade: "alta", resumo: "Sem acesso" }).prioridade).toBe("alta");
  });
  it("nunca inclui notas internas na conversa usada pela IA", () => {
    expect(conversaPublica([{ nota_interna: true, texto: "Segredo interno" }, { nota_interna: false, texto: "Câmera offline" }])).toEqual([{ nota_interna: false, texto: "Câmera offline" }]);
  });
});