import { z } from 'zod';
import { mensagemRecebidaSchema, telefoneWhatsApp, type MensagemRecebida } from '../whatsapp-rules';

export interface WhatsAppProvider {
  enviarMensagem(telefone: string, texto: string): Promise<{ status: 'simulada' | 'accepted'; idExterno: string | null }>;
  normalizarMensagemRecebida(payload: unknown): MensagemRecebida[];
}
const metaPayload = z.object({ entry: z.array(z.object({ changes: z.array(z.object({ value: z.object({ contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }) })).optional(), messages: z.array(z.object({ from: z.string(), id: z.string(), type: z.string(), text: z.object({ body: z.string() }).optional() })).optional() }) })) })) });
export function normalizarMensagemRecebida(payload: unknown): MensagemRecebida[] {
  const parsed = metaPayload.safeParse(payload);
  if (!parsed.success) return [];
  return parsed.data.entry.flatMap(e => e.changes.flatMap(c => (c.value.messages ?? []).map(m => mensagemRecebidaSchema.parse({ telefone: telefoneWhatsApp(m.from), nome: c.value.contacts?.find(x => x.wa_id === m.from)?.profile.name ?? '', texto: m.text?.body ?? `[Mensagem ${m.type} recebida; atendimento humano necessário]`, idExterno: m.id }))));
}
/** Versão da Graph API da Meta (v27.0, lançada em 04/11/2026). */
const GRAPH_API = 'https://graph.facebook.com/v27.0';
export function configuracaoWhatsApp() {
  const provedor = process.env['WHATSAPP_PROVIDER'] || 'meta';
  if (provedor !== 'meta') throw new Error('Provedor WhatsApp ainda não implementado.');
  const conectado = Boolean(process.env['WHATSAPP_TOKEN'] && process.env['WHATSAPP_PHONE_NUMBER_ID'] && process.env['WHATSAPP_VERIFY_TOKEN'] && process.env['WHATSAPP_APP_SECRET']);
  return { provedor, modo: conectado ? 'conectado' : 'simulação' };
}
// Future zapi adapter implements WhatsAppProvider here; no caller depends on Meta payloads or URLs.
export function obterProvedor(): WhatsAppProvider {
  const config = configuracaoWhatsApp();
  return {
    normalizarMensagemRecebida,
    async enviarMensagem(telefone, texto) {
      const destino = z.string().regex(/^\d{10,15}$/).parse(telefoneWhatsApp(telefone));
      z.string().min(1).max(4000).parse(texto);
      if (config.modo === 'simulação') return { status: 'simulada', idExterno: null };
      const phone = process.env['WHATSAPP_PHONE_NUMBER_ID'];
      if (!phone || !/^\d+$/.test(phone)) throw new Error('Identificador do número WhatsApp inválido.');
      const response = await fetch(`${GRAPH_API}/${phone}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${process.env['WHATSAPP_TOKEN']}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: destino, type: 'text', text: { body: texto } }) });
      const body = await response.text();
      if (!response.ok) throw new Error(`WhatsApp (${response.status}): ${body}`);
      const data = z.object({ messages: z.array(z.object({ id: z.string() })).min(1) }).parse(JSON.parse(body));
      return { status: 'accepted', idExterno: data.messages[0]?.id ?? null };
    },
  };
}
export async function validarAssinaturaMeta(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const expected = `sha256=${Array.from(digest, x => x.toString(16).padStart(2, '0')).join('')}`;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}