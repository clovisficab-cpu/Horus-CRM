export type ContratoFinanceiro = {
  id: string;
  cliente_id: string;
  valor_mensal: number | string;
  dia_vencimento: number;
  status: string;
};

export type FaturaFinanceiro = {
  contrato_id: string | null;
  referencia: string;
  status: string;
  vencimento: string;
  pago_em: string | null;
  valor: number | string;
};

/** Referência do mês atual no formato AAAA-MM. */
export function referenciaAtual(hoje = new Date()): string {
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

/** Data de vencimento (AAAA-MM-DD) do dia do contrato dentro do mês de referência, limitada ao último dia do mês. */
export function vencimentoDoMes(referencia: string, dia: number): string {
  const [ano, mes] = referencia.split("-").map(Number);
  const ultimoDia = new Date(ano!, mes!, 0).getDate();
  return `${referencia}-${String(Math.min(Math.max(dia, 1), ultimoDia)).padStart(2, "0")}`;
}

/** Faturas a criar: uma por contrato ativo, sem duplicar contrato + referência já existente (exceto canceladas). */
export function faturasAGerar(
  contratos: ContratoFinanceiro[],
  existentes: Pick<FaturaFinanceiro, "contrato_id" | "referencia" | "status">[],
  referencia: string,
) {
  const ocupadas = new Set(
    existentes.filter((f) => f.referencia === referencia && f.status !== "cancelado").map((f) => f.contrato_id),
  );
  return contratos
    .filter((c) => c.status === "ativo" && !ocupadas.has(c.id))
    .map((c) => ({
      cliente_id: c.cliente_id,
      contrato_id: c.id,
      referencia,
      valor: Number(c.valor_mensal),
      vencimento: vencimentoDoMes(referencia, c.dia_vencimento),
      status: "em_aberto",
    }));
}

/** IDs das faturas em aberto com vencimento passado, para marcar como vencidas. */
export function faturasVencidas(
  faturas: Pick<FaturaFinanceiro, "status" | "vencimento">[],
  hoje = new Date(),
): number[] {
  const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  return faturas
    .map((f, i) => (f.status === "em_aberto" && f.vencimento < data ? i : -1))
    .filter((i) => i >= 0);
}
