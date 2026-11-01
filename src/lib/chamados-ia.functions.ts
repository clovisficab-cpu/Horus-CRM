import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { categoriasIA, prioridadesIA, resultadoTriagem, conversaPublica } from './chamados-ia-rules';

const abertura = z.object({ cliente_id: z.string().uuid(), camera_id: z.string().uuid().nullable(), assunto: z.string().trim().min(1).max(200), descricao: z.string().trim().max(4000), categoria: z.enum(categoriasIA).nullable(), prioridade: z.enum(prioridadesIA).nullable(), canal: z.enum(['portal', 'telefone', 'whatsapp', 'interno']) });

async function executarIA(prompt: string, triagem: boolean, signal: AbortSignal) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: estado, error } = await supabaseAdmin.from('chamados_ia_estado').select('motivo').eq('id', true).maybeSingle();
  if (error) throw new Error('Não foi possível verificar a disponibilidade da IA.');
  if (estado) throw new Error(estado.motivo);
  const { chaveIA } = await import('./ai/responses.server');
  const key = chaveIA();
  if (!key) throw new Error('IA não configurada (AI_API_KEY).');
  const { criarChamadaIA, ErroIA, triagemSchema } = await import('./ai/responses.server');
  try {
    const result = criarChamadaIA(key, prompt, triagem, signal);
    // Consume every event, including terminal stream errors and refusals.
    for await (const part of result.fullStream) {
      if (part.type === 'error') throw part.error;
      if (part.type === 'finish' && part.finishReason === 'content-filter') throw new Error('A IA recusou esta solicitação.');
    }
    if (triagem) {
      const text = await result.text;
      try { return { triagem: triagemSchema.parse(await result.output), texto: '' }; }
      catch { return { triagem: triagemSchema.parse(JSON.parse(text)), texto: '' }; }
    }
    const texto = (await result.text).trim();
    if (!texto) throw new Error('A IA não retornou uma resposta.');
    return { triagem: null, texto: texto.slice(0, 4000) };
  } catch (err) {
    if (err instanceof ErroIA && err.status === 402) {
      const tipo = err.status === 402 || ['credit_limit_reached', 'ai_disabled'].includes(err.tipo) ? 'workspace' : 'acesso';
      const { error: pauseError } = await supabaseAdmin.from('chamados_ia_estado').upsert({ id: true, motivo: err.message, tipo });
      if (pauseError) throw new Error('IA indisponível; não foi possível registrar a pausa.');
    }
    throw err;
  }
}

export const abrirChamadoIA = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth]).inputValidator((d: unknown) => abertura.parse(d))
  .handler(async ({ data, context }) => {
    const { data: equipe, error: roleError } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
    if (roleError) throw new Error(roleError.message);
    if (!equipe) {
      const { data: vinculo, error } = await context.supabase.from('cliente_usuarios').select('cliente_id').eq('user_id', context.userId).eq('cliente_id', data.cliente_id).maybeSingle();
      if (error || !vinculo || data.canal !== 'portal') throw new Error('Acesso negado.');
    }
    if (data.camera_id) {
      const { data: camera } = await context.supabase.from('cameras').select('id').eq('id', data.camera_id).eq('cliente_id', data.cliente_id).maybeSingle();
      if (!camera) throw new Error('Câmera não vinculada a este cliente.');
    }
    let resultado = resultadoTriagem(data);
    let aviso: string | null = null;
    try {
      const ia = await executarIA(`Faça uma triagem. Categoria: ${categoriasIA.join(', ')}. Prioridade: ${prioridadesIA.join(', ')}. Resumo curto de até 500 caracteres. Classifique somente campos não informados. Dados: ${JSON.stringify(data)}`, true, getRequest().signal);
      if (ia.triagem) resultado = resultadoTriagem(data, ia.triagem);
    } catch (error) { aviso = error instanceof Error ? error.message : 'Não foi possível realizar a triagem com IA.'; }
    const { data: ch, error } = await context.supabase.from('chamados').insert({ ...data, categoria: resultado.categoria, prioridade: resultado.prioridade, descricao: data.descricao || null }).select('id').single();
    if (error || !ch) throw new Error(error?.message || 'Não foi possível abrir o chamado.');
    if (data.descricao) {
      const { error: msgError } = await context.supabase.from('chamado_mensagens').insert({ chamado_id: ch.id, autor: equipe ? 'equipe' : 'cliente', user_id: context.userId, texto: data.descricao });
      if (msgError) aviso = 'Chamado criado, mas a mensagem inicial não foi registrada.';
    }
    if (resultado.resumo_ia) {
      // Separate staff-only row prevents any client SELECT from exposing the summary.
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { error: resumoError } = await supabaseAdmin.from('chamados_resumos_ia').insert({ chamado_id: ch.id, resumo_ia: resultado.resumo_ia });
      if (resumoError) aviso = 'Chamado criado, mas não foi possível salvar o resumo da IA.';
    }
    return { id: ch.id, aviso: equipe ? aviso : null };
  });

export const sugerirRespostaIA = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: equipe } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
    if (!equipe) throw new Error('Apenas equipe.');
    const [ch, msgs, base, planos] = await Promise.all([
      context.supabase.from('chamados').select('assunto,descricao,categoria').eq('id', data.id).single(),
      context.supabase.from('chamado_mensagens').select('autor,texto,nota_interna').eq('chamado_id', data.id).eq('nota_interna', false).order('created_at', { ascending: false }).limit(60),
      context.supabase.from('base_conhecimento').select('pergunta,resposta,categoria').eq('publicada', true).order('created_at', { ascending: false }).limit(50),
      context.supabase.from('planos').select('nome,dias_gravacao').eq('ativo', true),
    ]);
    const error = ch.error || msgs.error || base.error || planos.error;
    if (error || !ch.data) return { texto: '', erro: error?.message || 'Chamado não encontrado.' };
    try {
      const ia = await executarIA(`Redija apenas um rascunho cordial e curto para o cliente, que será revisado pela equipe. Use a conversa e a base publicada. Se faltar informação, peça esclarecimento sem inventar. Não mencione notas internas. Dados: ${JSON.stringify({ chamado: ch.data, conversa: conversaPublica(msgs.data ?? []).reverse(), conhecimento: base.data, planos: planos.data })}`, false, getRequest().signal);
      return { texto: ia.texto, erro: null };
    } catch (error) { return { texto: '', erro: error instanceof Error ? error.message : 'Não foi possível sugerir uma resposta.' }; }
  });
