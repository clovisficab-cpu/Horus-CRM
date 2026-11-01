import { z } from "zod";

export const TIPOS_ORDEM = { instalacao: "Instalação", manutencao: "Manutenção", retirada: "Retirada", vistoria: "Vistoria" };
export const STATUS_ORDEM = { agendada: "Agendada", em_execucao: "Em execução", concluida: "Concluída", cancelada: "Cancelada" };
export const relatorioSchema = z.string().trim().min(1, "Informe o relatório do técnico.");
export const tecnicoPadrao = (papeis: string[], userId: string) => papeis.includes("tecnico") ? userId : "";
export function intervaloHoje(agora = new Date()) {
  const inicio = new Date(agora); inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio); fim.setDate(fim.getDate() + 1);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}
export function dataLocal(valor: string) {
  const d = new Date(valor);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}