import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { preCadastroSchema } from './pre-cadastro';

// Formulário público de pré-cadastro: sem login; o código aleatório do convite é a única chave,
// e toda escrita passa por funções do banco que validam o convite (uso único, validade, maioridade).

const codigoSchema = z.object({ codigo: z.string().regex(/^[A-Za-z0-9]{10,32}$/) });

export const obterConviteCadastro = createServerFn({ method: 'GET' }).inputValidator((d: unknown) => codigoSchema.parse(d)).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const r = await db.rpc('pre_cadastro_convite', { _codigo: data.codigo });
  if (r.error) throw new Error('Não foi possível abrir o cadastro agora. Tente novamente em instantes.');
  const c = r.data as { nome: string; telefone: string | null; interesse: string | null; situacao: 'valido' | 'usado' | 'expirado' } | null;
  if (!c) return { situacao: 'invalido' as const, nome: '', telefone: '', interesse: '' };
  // Telefone parcialmente oculto: só para o cliente reconhecer o número.
  const tel = (c.telefone ?? '').replace(/^55(\d{2})(\d+)(\d{4})$/, (_, ddd: string, meio: string, fim: string) => `(${ddd}) ${'•'.repeat(meio.length)}-${fim}`);
  return { situacao: c.situacao, nome: c.nome, telefone: tel, interesse: c.interesse ?? '' };
});

export const enviarPreCadastro = createServerFn({ method: 'POST' }).inputValidator((d: unknown) => preCadastroSchema.parse(d)).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { codigo, ...dados } = data;
  const r = await db.rpc('pre_cadastro_enviar', { _codigo: codigo, _dados: { ...dados, documento: dados.documento.replace(/\D/g, ''), cameras: String(dados.cameras) } });
  if (r.error) throw new Error(/link|maior|Política/i.test(r.error.message) ? r.error.message : 'Não foi possível enviar seu cadastro agora. Tente novamente em instantes.');
  if (r.data) {
    // Confirmação da Íris no WhatsApp (falha no envio não desfaz o cadastro).
    const { enviarPendente } = await import('./whatsapp/bot.server');
    await enviarPendente(r.data).catch((e) => console.error('[pre-cadastro] confirmação no WhatsApp falhou', e));
  }
  return { ok: true };
});
