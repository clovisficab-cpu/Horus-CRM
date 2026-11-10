import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MENU_WHATSAPP, RESPOSTAS_MENU } from '@/lib/whatsapp-rules';

// Banco falso: cada consulta encadeada resolve com o resultado configurado para a tabela.
const estado = vi.hoisted(() => ({ texto: '', anteriores: 0, rpc: [] as Record<string, unknown>[], ia: 0 }));
vi.mock('@/integrations/supabase/client.server', () => {
  const consulta = (tabela: string) => {
    let op = 'select';
    const resultado = () => {
      if (tabela === 'whatsapp_bot_jobs' && op === 'update') return { data: { id: 'job', whatsapp_mensagens: { id: 'm', texto: estado.texto, created_at: new Date().toISOString(), whatsapp_conversas: { id: 'c', modo: 'bot', cliente_id: null } } }, error: null };
      if (tabela === 'whatsapp_mensagens' && op === 'select') return { data: [], count: estado.anteriores, error: null };
      return { data: null, error: null };
    };
    const q: Record<string, unknown> = {};
    for (const k of ['select', 'eq', 'lt', 'gte', 'is', 'order', 'limit', 'in', 'not']) q[k] = () => q;
    q['update'] = () => { op = 'update'; return q; };
    q['maybeSingle'] = async () => resultado();
    q['single'] = async () => resultado();
    q['then'] = (ok: (v: unknown) => unknown) => Promise.resolve(resultado()).then(ok);
    return q;
  };
  return { supabaseAdmin: { from: consulta, rpc: async (_: string, args: Record<string, unknown>) => { estado.rpc.push(args); return { data: null, error: null }; } } };
});
vi.mock('@/lib/ai/responses.server', () => ({ ErroIA: class extends Error {}, chaveIA: () => { estado.ia++; return undefined; }, modeloIA: () => null }));

const { processarJob } = await import('@/lib/whatsapp/bot.server');
async function responder(texto: string, anteriores = 0) {
  Object.assign(estado, { texto, anteriores, rpc: [], ia: 0 });
  await processarJob('job');
  return estado.rpc[0] as { _acao: string; _texto: string };
}

describe('robô do WhatsApp', () => {
  beforeEach(() => { estado.rpc = []; });
  it('cumprimento no primeiro contato recebe o menu, sem IA', async () => { expect(await responder('Olá, teste')).toMatchObject({ _acao: 'responder', _texto: MENU_WHATSAPP }); expect(estado.ia).toBe(0); });
  it('opção 3 segue para o Financeiro (inclusive "3." e "opção 3")', async () => {
    for (const t of ['3', '3 ', '3.', 'opção 3']) expect(await responder(t, 1), t).toMatchObject({ _acao: 'responder', _texto: RESPOSTAS_MENU[3] });
    expect(estado.ia).toBe(0);
  });
  it('opção 4 passa a conversa para a equipe', async () => expect((await responder('4', 1))._acao).toBe('transferir'));
  it('no meio do atendimento, falha da IA encaminha para a equipe em vez de repetir o menu', async () => expect(await responder('minha câmera da garagem parou', 1)).toMatchObject({ _acao: 'transferir' }));
  it('no primeiro contato, falha da IA ainda envia o menu', async () => expect(await responder('minha câmera da garagem parou', 0)).toMatchObject({ _acao: 'responder', _texto: MENU_WHATSAPP }));
  it('cumprimento no meio do atendimento não repete o menu', async () => expect((await responder('oi', 1))._texto).not.toBe(MENU_WHATSAPP));
});
