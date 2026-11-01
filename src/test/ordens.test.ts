import { describe, it, expect } from "vitest";
import { intervaloHoje, relatorioSchema, tecnicoPadrao } from "@/lib/ordens";

describe("Ordens de serviço", () => {
  it("exige relatório não vazio para concluir", () => {
    expect(relatorioSchema.safeParse("   ").success).toBe(false);
    expect(relatorioSchema.parse(" Câmera reparada ")).toBe("Câmera reparada");
  });
  it("seleciona as próprias ordens por padrão para técnico", () => {
    expect(tecnicoPadrao(["tecnico"], "tecnico-1")).toBe("tecnico-1");
    expect(tecnicoPadrao(["admin"], "admin-1")).toBe("");
  });
  it("delimita visitas hoje entre meia-noite e o próximo dia", () => {
    const { inicio, fim } = intervaloHoje(new Date(2026, 9, 19, 15));
    expect(new Date(inicio).getHours()).toBe(0);
    expect(new Date(inicio).getDate()).toBe(19);
    expect(new Date(fim).getDate()).toBe(20);
  });
});