import { supabaseAdmin as db } from '@/integrations/supabase/client.server';
import { obterProvedor } from './provider.server';

/** Números de teste do simulador: DDD 00 não existe, então nunca chegam a um WhatsApp real. */
export const numeroDeTeste = (telefone: string) => /^5500\d{8,9}$/.test(telefone);

export async function enviarPendente(id: string) {
  const { data: m, error } = await db.from('whatsapp_mensagens').update({ status: 'enviando' }).eq('id', id).eq('status', 'pendente').select('*, whatsapp_conversas(telefone)').maybeSingle();
  if (error) throw error;
  if (!m) return;
  try {
    if (!m.whatsapp_conversas) throw new Error('Conversa não encontrada.');
    const result = numeroDeTeste(m.whatsapp_conversas.telefone)
      ? { status: 'simulada' as const, idExterno: null }
      : await obterProvedor().enviarMensagem(m.whatsapp_conversas.telefone, m.texto);
    const saved = await db.from('whatsapp_mensagens').update({ status: result.status, id_externo: result.idExterno }).eq('id', m.id);
    if (saved.error) throw saved.error;
  } catch (err) {
    // An uncertain network outcome is never automatically resent.
    const saved = await db.from('whatsapp_mensagens').update({ status: 'falha', erro: err instanceof Error ? err.message : 'Falha no envio; verificar antes de reenviar.' }).eq('id', m.id);
    if (saved.error) throw saved.error;
  }
}

/** Mantido para o agendador: a lógica fica na Íris. */
export { processarPendentes } from '@/lib/iris/fluxo.server';
