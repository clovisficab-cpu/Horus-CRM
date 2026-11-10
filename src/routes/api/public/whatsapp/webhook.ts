import { createFileRoute } from '@tanstack/react-router';

/** Continua o trabalho depois da resposta (Cloudflare: waitUntil, até ~30 s). Sem ele (dev local), roda solto. */
function emSegundoPlano(request: Request, tarefa: Promise<unknown>) {
  const waitUntil = (request as Request & { waitUntil?: (p: Promise<unknown>) => void }).waitUntil;
  if (typeof waitUntil === 'function') waitUntil(tarefa); else void tarefa;
}

export const Route=createFileRoute('/api/public/whatsapp/webhook')({server:{handlers:{
  GET:async ({request})=>{
    const u=new URL(request.url); const token=process.env['WHATSAPP_VERIFY_TOKEN'];
    if(!token || u.searchParams.get('hub.mode')!=='subscribe' || u.searchParams.get('hub.verify_token')!==token) return new Response('Verificação recusada',{status:403});
    const challenge=u.searchParams.get('hub.challenge');
    if(!challenge || !/^\d{1,100}$/.test(challenge)) return new Response('Verificação inválida',{status:400});
    return new Response(challenge);
  },
  POST:async ({request})=>{
    const {configuracaoWhatsApp,obterProvedor,validarAssinaturaMeta}=await import('@/lib/whatsapp/provider.server');
    const secret=process.env['WHATSAPP_APP_SECRET'];
    if(configuracaoWhatsApp().modo!=='conectado' || !secret) return new Response('Integração em simulação',{status:503});
    const reader=request.body?.getReader(); if(!reader) return new Response('Corpo ausente',{status:400});
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>1024*1024){await reader.cancel();return new Response('Mensagem muito grande',{status:413});}chunks.push(r.value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const raw=new TextDecoder().decode(bytes);
    if(!await validarAssinaturaMeta(raw,request.headers.get('x-hub-signature-256'),secret))return new Response('Assinatura inválida',{status:401});
    let payload:unknown;try{payload=JSON.parse(raw);}catch{return new Response('Mensagem inválida',{status:400});}
    const hash=await crypto.subtle.digest('SHA-256',bytes);const delivery=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
    const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
    const saved=await db.from('whatsapp_webhook_events').upsert({delivery_id:delivery,event:'meta',payload:payload as import('@/integrations/supabase/types').Json},{onConflict:'delivery_id',ignoreDuplicates:true});
    if(saved.error)return new Response('Não foi possível registrar mensagem',{status:500});
    const event=await db.from('whatsapp_webhook_events').select('id,processed_at').eq('delivery_id',delivery).single();
    if(event.error)return new Response('Falha ao ler recebimento',{status:500});
    if(event.data.processed_at)return new Response('ok');
    try{
      const recebidas=new Map<string,string>(); // conversa -> último id externo
      for(const m of obterProvedor().normalizarMensagemRecebida(payload)){
        const r=await db.rpc('whatsapp_receber',{_telefone:m.telefone,_nome:m.nome,_texto:m.texto,_externo:m.idExterno});if(r.error)throw r.error;
        const msg=await db.from('whatsapp_mensagens').select('conversa_id').eq('id',r.data).single();if(msg.error)throw msg.error;
        recebidas.set(msg.data.conversa_id,m.idExterno);
      }
      const processed=await db.from('whatsapp_webhook_events').update({processed_at:new Date().toISOString(),processing_error:null}).eq('id',event.data.id);if(processed.error)throw processed.error;
      // Mensagem gravada: responde 200 à Meta já e atende em segundo plano (o agendador cobre se isto for interrompido).
      if(recebidas.size){
        const {aoReceberMensagem}=await import('@/lib/iris/fluxo.server');
        emSegundoPlano(request,Promise.all([...recebidas].map(([conversa,externo])=>aoReceberMensagem(conversa,externo).catch(e=>console.error('[iris] atendimento em segundo plano falhou',e)))));
      }
      return new Response('ok');
    }catch(err){const failed=await db.from('whatsapp_webhook_events').update({processing_error:err instanceof Error?err.message:'Falha'}).eq('id',event.data.id);return new Response(failed.error?'Falha ao registrar erro':'Falha no processamento',{status:500});}
  },
}}});