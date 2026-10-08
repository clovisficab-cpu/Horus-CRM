export function brl(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function date(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valor para <input type="datetime-local"> */
export function toInputDateTime(d: Date | null | undefined) {
  if (!d) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

/** Normaliza telefone brasileiro para o formato do WhatsApp (55 + DDD + número) */
export function normalizePhone(s: string | null | undefined) {
  const d = onlyDigits(s);
  if (!d) return "";
  if (d.length <= 11) return "55" + d;
  return d;
}

export function ticketCode(n: number) {
  return "#" + String(n).padStart(5, "0");
}
