// Rótulos e valores válidos dos campos "enum" do schema

export const ROLES = {
  ADMIN: "Administrador",
  AGENT: "Atendente",
  TECH: "Técnico",
  CLIENT: "Cliente",
} as const;
export const STAFF_ROLES = ["ADMIN", "AGENT", "TECH"];

export const CUSTOMER_STATUS = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  INACTIVE: "Inativo",
} as const;

export const LEAD_STAGES = {
  NEW: "Novo",
  CONTACTED: "Contato feito",
  VISIT: "Visita técnica",
  PROPOSAL: "Proposta enviada",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
} as const;

export const LEAD_SOURCES = {
  SITE: "Site",
  WHATSAPP: "WhatsApp",
  INDICACAO: "Indicação",
  TELEFONE: "Telefone",
  OUTRO: "Outro",
} as const;

export const TICKET_CATEGORIES = {
  CAMERA_OFFLINE: "Câmera offline",
  IMAGE_QUALITY: "Qualidade de imagem",
  FOOTAGE_REQUEST: "Solicitação de gravação",
  ACCESS: "Acesso / senha / app",
  BILLING: "Financeiro",
  INSTALLATION: "Instalação / nova câmera",
  MAINTENANCE: "Manutenção",
  OTHER: "Outros",
} as const;

export const TICKET_PRIORITIES = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
} as const;

/** Prazo de SLA em horas por prioridade */
export const SLA_HOURS: Record<string, number> = {
  URGENT: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

export const TICKET_STATUS = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em atendimento",
  WAITING_CUSTOMER: "Aguardando cliente",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
} as const;

export const TICKET_CHANNELS = {
  WEB: "Interno",
  PORTAL: "Portal",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  EMAIL: "E-mail",
  MONITOR: "Monitoramento automático",
} as const;

export const CAMERA_STATUS = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  MAINTENANCE: "Manutenção",
} as const;

export const STREAM_TYPES = {
  HLS: "HLS (.m3u8)",
  MJPEG: "MJPEG",
  IFRAME: "Incorporado (iframe)",
  IMAGE: "Imagem / snapshot",
} as const;

export const SERVICE_ORDER_TYPES = {
  INSTALLATION: "Instalação",
  MAINTENANCE: "Manutenção",
  REMOVAL: "Retirada",
  INSPECTION: "Vistoria",
} as const;

export const SERVICE_ORDER_STATUS = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em execução",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
} as const;

export const CONTRACT_STATUS = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
} as const;

export const INVOICE_STATUS = {
  OPEN: "Em aberto",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
} as const;

export const ACTIVITY_TYPES = {
  NOTE: "Anotação",
  CALL: "Ligação",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  MEETING: "Reunião",
  VISIT: "Visita",
  SYSTEM: "Sistema",
} as const;

export function label(map: Record<string, string>, key: string | null | undefined) {
  if (!key) return "—";
  return map[key] ?? key;
}
