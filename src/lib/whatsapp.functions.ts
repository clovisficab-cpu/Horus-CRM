import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mensagemRecebidaSchema, telefoneWhatsApp } from './whatsapp-rules';

async function equipe(context: { supabase: import('@supabase/supabase-js').SupabaseClient<import('@/integrations/supabase/types').Database>; userId:string }) {
  const r = await context.supabase.rpc('is_staff',{_user_id:context.userId});
  if (r.error || !r.data) throw new Error('Acesso exclusivo da equipe.');
}
export const dadosWhatsApp = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
  await equipe(context);
  const { configuracaoWhatsApp } = await import('./whatsapp/provider.server');
  const [conversas,clientes] = await Promise.all([context.supabase.from('whatsapp_conversas').select('*,clientes(nome)').order('nao_lidas',{ascending:false}).order('ultima_mensagem_em',{ascending:false}),context.supabase.from('clientes').select('id,nome').order('nome')]);
  if(conversas.error || clientes.error) throw new Error(conversas.error?.message || clientes.error?.message);
  // Sem a migração 0008 a tabela não existe: o painel abre sem os controles da Íris.
  const config=await context.supabase.from('whatsapp_config').select('*').eq('id',true).maybeSingle();
  return {conversas:conversas.data ?? [],clientes:clientes.data ?? [],integracao:configuracaoWhatsApp(),config:config.error?null:config.data,migracaoPendente:Boolean(config.error)};
});
export const simularWhatsApp = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({telefone:z.string().min(10).max(30),nome:z.string().max(200),texto:z.string().trim().min(1).max(4000)}).parse(d)).handler(async ({data,context})=>{
  await equipe(context);
  const { configuracaoWhatsApp } = await import('./whatsapp/provider.server');
  const { numeroDeTeste } = await import('./whatsapp/bot.server');
  const telefone=telefoneWhatsApp(data.telefone);
  // Com o WhatsApp conectado, o simulador só aceita números de teste (DDD 00), para nunca responder a um cliente real.
  if(configuracaoWhatsApp().modo!=='simulação' && !numeroDeTeste(telefone)) throw new Error('Com o WhatsApp conectado, simule com um número de teste com DDD 00, por exemplo (00) 99999-0001.');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const input=mensagemRecebidaSchema.parse({...data,telefone,idExterno:`sim-${crypto.randomUUID()}`});
  const r=await db.rpc('whatsapp_receber',{_telefone:input.telefone,_nome:input.nome,_texto:input.texto,_externo:input.idExterno});
  if(r.error) throw r.error;
  const mensagem=await db.from('whatsapp_mensagens').select('conversa_id').eq('id',r.data).single();
  if(mensagem.error) throw mensagem.error;
  const {atenderConversa,avisarAguardandoEquipe}=await import('./iris/fluxo.server');
  await atenderConversa(mensagem.data.conversa_id,{esperaMs:0});
  await avisarAguardandoEquipe(mensagem.data.conversa_id);
  return {conversaId:mensagem.data.conversa_id};
});
export const agirWhatsApp=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),acao:z.enum(['assumir','bot','lida','vincular','lead','responder','resolver_urgencia']),texto:z.string().trim().max(4000).optional(),clienteId:z.string().uuid().nullable().optional()}).parse(d)).handler(async ({data,context})=>{
  await equipe(context);
  const conversa=await context.supabase.from('whatsapp_conversas').select('*').eq('id',data.id).single();
  if(conversa.error) throw conversa.error;
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  if(data.acao==='responder') {
    if(!data.texto) throw new Error('Informe a mensagem.');
    const updated=await db.from('whatsapp_conversas').update({modo:'humano',nao_lidas:0,ultima_mensagem:data.texto,ultima_mensagem_em:new Date().toISOString()}).eq('id',data.id);
    if(updated.error) throw updated.error;
    const r=await db.from('whatsapp_mensagens').insert({conversa_id:data.id,direcao:'saida',remetente:'atendente',texto:data.texto,status:'pendente'}).select('id').single();
    if(r.error) throw r.error;
    const {enviarPendente}=await import('./whatsapp/bot.server'); await enviarPendente(r.data.id);
  } else if(data.acao==='lead') {
    if(conversa.data.cliente_id || conversa.data.lead_id) throw new Error('Contato já vinculado ou lead já criado.');
    const r=await context.supabase.from('leads').insert({nome:conversa.data.nome || conversa.data.telefone,telefone:conversa.data.telefone,origem:'whatsapp',observacoes:conversa.data.ultima_mensagem}).select('id').single();
    if(r.error) throw r.error;
    const u=await db.from('whatsapp_conversas').update({lead_id:r.data.id}).eq('id',data.id); if(u.error) throw u.error;
  } else if(data.acao==='resolver_urgencia') {
    const r=await context.supabase.from('whatsapp_conversas').update({urgente:false}).eq('id',data.id); if(r.error) throw r.error;
  } else {
    if(data.acao==='assumir'||data.acao==='bot') {
      // Assumir: a Íris fica em silêncio. Devolver: o próximo contato abre um atendimento novo da Íris.
      const a=await db.from('whatsapp_atendimentos').update(data.acao==='assumir'?{atendido_por:'humano',status:'transferido'}:{status:'encerrado',encerrado_em:new Date().toISOString()}).eq('conversa_id',data.id).in('status',data.acao==='assumir'?['aberto']:['aberto','transferido']);
      if(a.error && !['PGRST205','42P01'].includes(a.error.code)) throw a.error; // sem a migração 0008, segue só com o modo da conversa
      // Assumir: um atendente está presente, então a Íris não manda nem o aviso de "mensagem registrada".
      if(data.acao==='assumir'){const t=await db.from('whatsapp_conversas').update({transferida_em:null}).eq('id',data.id);if(t.error && !['PGRST204','42703'].includes(t.error.code)) throw t.error;}
    }
    if(data.acao==='vincular' && data.clienteId) {const c=await context.supabase.from('clientes').select('id').eq('id',data.clienteId).single();if(c.error) throw c.error;}
    const r=await context.supabase.from('whatsapp_conversas').update(data.acao==='vincular'?{cliente_id:data.clienteId ?? null}:data.acao==='lida'?{nao_lidas:0}:{modo:data.acao==='bot'?'bot':'humano'}).eq('id',data.id);
    if(r.error) throw r.error;
  }
  return {ok:true};
});
export const enviarRespostaChamadoWhatsApp=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),texto:z.string().trim().min(1).max(4000),nota:z.boolean()}).parse(d)).handler(async ({data,context})=>{
  await equipe(context);
  const ch=await context.supabase.from('chamados').select('id').eq('id',data.id).single();
  if(ch.error) throw ch.error;
  const r=await context.supabase.from('chamado_mensagens').insert({chamado_id:data.id,autor:'equipe',user_id:context.userId,texto:data.texto,nota_interna:data.nota}).select('id').single();
  if(r.error) throw r.error;
  if(!data.nota) {
    const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
    const m=await db.from('whatsapp_mensagens').select('id').eq('chamado_mensagem_id',r.data.id).maybeSingle();
    if(m.error) throw m.error;
    if(m.data) {const {enviarPendente}=await import('./whatsapp/bot.server');await enviarPendente(m.data.id);}
  }
  return {ok:true};
});
export const salvarConfigIris=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({
  iris_ativa:z.boolean(),
  horario:z.record(z.enum(['0','1','2','3','4','5','6']),z.tuple([z.string().regex(/^\d{2}:\d{2}$/),z.string().regex(/^\d{2}:\d{2}$/)])),
  plantao_telefone:z.string().trim().max(30).nullable(),
  endereco_aprovacao_humana:z.boolean(),
  limite_mensagens_minuto:z.number().int().min(1).max(60),
  visita_horarios:z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(12),
  visita_duracao_min:z.number().int().min(30).max(480),
}).parse(d)).handler(async ({data,context})=>{
  await equipe(context);
  const plantao=data.plantao_telefone?telefoneWhatsApp(data.plantao_telefone):null;
  if(plantao && !/^\d{12,13}$/.test(plantao)) throw new Error('Número do plantão inválido. Use DDD + número, por exemplo (27) 99999-0000.');
  const r=await context.supabase.from('whatsapp_config').update({...data,plantao_telefone:plantao,updated_at:new Date().toISOString()}).eq('id',true);
  if(r.error) throw r.error;
  return {ok:true};
});
