import { describe, expect, it } from "vitest";
import { faturasAGerar, faturasVencidas, referenciaAtual, vencimentoDoMes } from "@/lib/financeiro";

const contrato = { id: "c1", cliente_id: "cli1", valor_mensal: 199.9, dia_vencimento: 10, status: "ativo" };

describe("Geração de faturas do mês", () => {
  it("cria uma fatura por contrato ativo com valor e vencimento do contrato", () => {
    const novas = faturasAGerar([contrato], [], "2026-10");
    expect(novas).toEqual([
      { cliente_id: "cli1", contrato_id: "c1", referencia: "2026-10", valor: 199.9, vencimento: "2026-10-10", status: "em_aberto" },
    ]);
  });
  it("não duplica fatura já existente para o contrato na referência", () => {
    const existentes = [{ contrato_id: "c1", referencia: "2026-10", status: "em_aberto" }];
    expect(faturasAGerar([contrato], existentes, "2026-10")).toEqual([]);
  });
  it("permite recriar quando a fatura anterior da referência foi cancelada", () => {
    const existentes = [{ contrato_id: "c1", referencia: "2026-10", status: "cancelado" }];
    expect(faturasAGerar([contrato], existentes, "2026-10")).toHaveLength(1);
  });
  it("ignora contratos suspensos e cancelados", () => {
    const inativos = [
      { ...contrato, id: "c2", status: "suspenso" },
      { ...contrato, id: "c3", status: "cancelado" },
    ];
    expect(faturasAGerar(inativos, [], "2026-10")).toEqual([]);
  });
  it("limita o dia de vencimento ao último dia do mês", () => {
    expect(vencimentoDoMes("2026-02", 31)).toBe("2026-02-28");
  });
});

describe("Atualização de vencidas", () => {
  it("marca apenas faturas em aberto com vencimento passado", () => {
    const faturas = [
      { status: "em_aberto", vencimento: "2000-01-01" },
      { status: "em_aberto", vencimento: "2999-01-01" },
      { status: "pago", vencimento: "2000-01-01" },
    ];
    expect(faturasVencidas(faturas)).toEqual([0]);
  });
  it("referência atual segue o formato AAAA-MM", () => {
    expect(referenciaAtual(new Date("2026-10-20T12:00:00"))).toBe("2026-10");
  });
});
