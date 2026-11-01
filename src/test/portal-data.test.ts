import { describe, expect, it } from "vitest";
import { statusFatura } from "@/lib/portal-data";

describe("Status das faturas do portal", () => {
  it("marca fatura em aberto com vencimento passado como vencida", () => {
    expect(statusFatura({ status: "em_aberto", vencimento: "2000-01-01" })).toBe("vencido");
  });
  it("preserva faturas pagas e canceladas mesmo após o vencimento", () => {
    expect(statusFatura({ status: "pago", vencimento: "2000-01-01" })).toBe("pago");
    expect(statusFatura({ status: "cancelado", vencimento: "2000-01-01" })).toBe("cancelado");
  });
  it("mantém fatura futura em aberto", () => {
    expect(statusFatura({ status: "em_aberto", vencimento: "2999-01-01" })).toBe("em_aberto");
  });
});