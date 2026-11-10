import { z } from 'zod';

export const mensagemRecebidaSchema = z.object({ telefone: z.string().regex(/^\d{10,15}$/), nome: z.string().max(200), texto: z.string().trim().min(1).max(4000), idExterno: z.string().min(1).max(250) });
export type MensagemRecebida = z.infer<typeof mensagemRecebidaSchema>;
export function telefoneWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}
export function pedeHumano(texto: string) {
  return /\b(humano|atendente|cancelar|cancelamento|negociar|negociação|irritado|absurdo|péssimo)\b/i.test(texto);
}
