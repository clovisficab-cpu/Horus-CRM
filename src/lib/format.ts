export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataBR = (d: string | null | undefined) => {
  if (!d) return "—";
  const s = d.length === 10 ? d + "T12:00:00" : d;
  return new Date(s).toLocaleDateString("pt-BR");
};

export const dataHoraBR = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export const ETAPAS = [
  { id: "novo", label: "Novo" },
  { id: "contato", label: "Contato feito" },
  { id: "visita", label: "Visita técnica" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "ganho", label: "Ganho" },
  { id: "perdido", label: "Perdido" },
] as const;

export const ORIGENS: Record<string, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  telefone: "Telefone",
};

export const STATUS_FATURA: Record<string, string> = {
  em_aberto: "Em aberto",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const STATUS_CAMERA: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  manutencao: "Manutenção",
};

export const PAPEIS: Record<string, string> = {
  admin: "Administrador",
  atendente: "Atendente",
  tecnico: "Técnico",
  cliente: "Cliente",
};
