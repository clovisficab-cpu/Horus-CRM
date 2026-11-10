import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { MessageCircle, Send, FlaskConical, UserCheck, Bot, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, Field, Pill, selectCls, errMsg } from '@/components/kit';
import { dadosWhatsApp, agirWhatsApp, simularWhatsApp } from '@/lib/whatsapp.functions';
import { supabase } from '@/integrations/supabase/client';
import { equipeHead } from '@/lib/page-head';
import { dataHoraBR } from '@/lib/format';
import { cn } from '@/lib/utils';

const options=(userId:string)=>queryOptions({queryKey:['whatsapp',userId],queryFn:()=>dadosWhatsApp(),refetchInterval:10_000});
const ESTADO_ROBO: Record<string,string>={pendente:'aguardando',processando:'processando',respondido:'respondeu',concluido:'concluído',falha:'falhou'};
export const Route=createFileRoute('/_authenticated/admin/whatsapp')({head:()=>equipeHead('WhatsApp','Conversas, atendimento e simulação WhatsApp da Horus.'),loader:({context})=>context.queryClient.ensureQueryData(options(context.user.id)),component:WhatsApp});
function WhatsApp(){
  const {user}=Route.useRouteContext();const {data}=useSuspenseQuery(options(user.id));const qc=useQueryClient();
  const agir=useServerFn(agirWhatsApp);const simular=useServerFn(simularWhatsApp);
  const [id,setId]=useState('');const [filtro,setFiltro]=useState('');const [busca,setBusca]=useState('');const [texto,setTexto]=useState('');const [ocupado,setOcupado]=useState(false);const [sim,setSim]=useState(false);const [telefone,setTelefone]=useState('');const [nome,setNome]=useState('');const [recebida,setRecebida]=useState('');
  const c=data.conversas.find(x=>x.id===id);
  const {data:mensagens=[]}=useQuery({queryKey:['whatsapp-mensagens',user.id,id],enabled:Boolean(id),queryFn:async()=>{const r=await supabase.from('whatsapp_mensagens').select('*').eq('conversa_id',id).order('created_at');if(r.error)throw r.error;const entradas=r.data.filter(m=>m.direcao==='entrada').map(m=>m.id);const j=entradas.length?await supabase.from('whatsapp_bot_jobs').select('mensagem_id,status,erro').in('mensagem_id',entradas):{data:[],error:null};if(j.error)throw j.error;const jobs=new Map(j.data.map(x=>[x.mensagem_id,x]));return r.data.map(m=>({...m,job:jobs.get(m.id)??null}));},refetchInterval:5000});
  const recarregar=async()=>{await Promise.all([qc.invalidateQueries({queryKey:['whatsapp',user.id]}),qc.invalidateQueries({queryKey:['whatsapp-mensagens',user.id]})]);};
  async function acao(tipo:'assumir'|'bot'|'lida'|'lead'|'responder'|'vincular',clienteId?:string){
    setOcupado(true);try{await agir({data:{id,acao:tipo,texto:tipo==='responder'?texto:undefined,clienteId:clienteId || null}});if(tipo==='responder')setTexto('');await recarregar();}catch(e){toast.error(errMsg(e));}finally{setOcupado(false);}
  }
  async function simularEntrada(){setOcupado(true);try{const r=await simular({data:{telefone,nome,texto:recebida}});setId(r.conversaId);setRecebida('');setSim(false);await recarregar();}catch(e){toast.error(errMsg(e));}finally{setOcupado(false);}}
  const webhook=typeof window==='undefined'?'':`${window.location.origin}/api/public/whatsapp/webhook`;
  return <>
    <PageHeader title="WhatsApp" actions={<><Pill tone={data.integracao.modo==='conectado'?'success':'warning'}>{data.integracao.modo==='conectado'?'Conectado':'Simulação'}</Pill><Button variant="outline" onClick={()=>setSim(true)} disabled={data.integracao.modo==='conectado'}><FlaskConical/>Simular mensagem recebida</Button></>}/>
    <div className="mb-4 border-b border-border pb-4 text-sm"><span className="text-muted-foreground">Webhook Meta: </span><span className="break-all select-all">{webhook}</span></div>
    <div className="grid min-h-[650px] border border-border rounded-lg md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b border-border md:border-b-0 md:border-r">
        <div className="space-y-2 border-b border-border p-3"><Input aria-label="Buscar conversa" placeholder="Nome ou telefone" value={busca} onChange={e=>setBusca(e.target.value)}/><select aria-label="Filtrar atendimento" className={selectCls} value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="">Bot e humano</option><option value="bot">Bot</option><option value="humano">Humano</option></select></div>
        <div className="max-h-[480px] overflow-y-auto">{data.conversas.filter(x=>(!filtro||x.modo===filtro)&&`${x.nome} ${x.telefone}`.toLowerCase().includes(busca.toLowerCase())).map(x=><Button key={x.id} variant="ghost" className={cn('h-auto w-full justify-start rounded-none border-b border-border px-4 py-3 text-left',id===x.id&&'bg-accent')} onClick={async()=>{setId(x.id);try{await agir({data:{id:x.id,acao:'lida'}});await recarregar();}catch(e){toast.error(errMsg(e));}}}><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.nome||x.telefone}</span>{x.nao_lidas>0&&<Pill tone="gold">{x.nao_lidas}</Pill>}</div><p className="truncate text-xs text-muted-foreground">{x.ultima_mensagem}</p><p className="mt-1 text-xs text-muted-foreground">{x.modo==='bot'?'Bot':'Humano'} · {dataHoraBR(x.ultima_mensagem_em)}</p></div></Button>)}{!data.conversas.length&&<p className="p-5 text-sm text-muted-foreground">Nenhuma conversa.</p>}</div>
      </aside>
      {c?<section className="flex min-w-0 flex-col"><header className="border-b border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{c.nome||c.telefone}</h2><p className="text-xs text-muted-foreground">{c.telefone} · {c.modo==='bot'?'Bot':'Humano'}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={ocupado} onClick={()=>acao(c.modo==='bot'?'assumir':'bot')}>{c.modo==='bot'?<UserCheck/>:<Bot/>}{c.modo==='bot'?'Assumir':'Devolver ao bot'}</Button>{!c.cliente_id&&!c.lead_id&&<Button size="sm" variant="outline" disabled={ocupado} onClick={()=>acao('lead')}><UserPlus/>Criar lead</Button>}</div></div><div className="mt-3"><select aria-label="Vincular a cliente" className={selectCls} value={c.cliente_id??''} disabled={ocupado} onChange={e=>acao('vincular',e.target.value)}><option value="">Contato não vinculado</option>{data.clientes.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select>{c.lead_id&&<p className="mt-1 text-xs text-muted-foreground">Lead criado</p>}</div></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 max-h-[520px]" aria-label="Mensagens WhatsApp">{mensagens.map(m=><div key={m.id} className={cn('flex',m.direcao==='saida'?'justify-end':'justify-start')}><div className={cn('max-w-[88%] rounded-lg border px-3 py-2',m.direcao==='saida'?'border-primary/20 bg-primary/10':'border-border bg-card')}><p className="text-xs text-muted-foreground">{m.remetente==='ia'?'Horus · IA':m.remetente==='atendente'?'Equipe Horus':c.nome||'Cliente'}</p><p className="whitespace-pre-wrap break-words text-sm">{m.texto}</p><p className="mt-1 text-right text-xs text-muted-foreground">{dataHoraBR(m.created_at)} · {m.status==='accepted'?'Aceita pela Meta':m.status}</p>{m.erro&&<p className="mt-1 break-words text-xs text-destructive">{m.erro}</p>}{m.job&&<p className={cn('mt-1 break-words text-xs',m.job.status==='falha'?'text-destructive':m.job.erro?'text-amber-500':'text-muted-foreground')}>Robô: {ESTADO_ROBO[m.job.status]??m.job.status}{m.job.erro?` — ${m.job.erro}`:''}</p>}</div></div>)}</div>
        <footer className="space-y-2 border-t border-border p-4"><Textarea aria-label="Resposta do atendente" placeholder="Escreva sua resposta…" value={texto} maxLength={4000} onChange={e=>setTexto(e.target.value)}/><div className="flex justify-end"><Button disabled={ocupado||!texto.trim()} onClick={()=>acao('responder')}><Send/>Enviar</Button></div></footer>
      </section>:<section className="flex items-center justify-center p-8 text-muted-foreground"><MessageCircle className="mr-2 h-5 w-5"/>Nenhuma conversa selecionada</section>}
    </div>
    <Dialog open={sim} onOpenChange={setSim}><DialogContent><DialogHeader><DialogTitle>Simular mensagem recebida</DialogTitle></DialogHeader><Field label="Telefone"><Input aria-label="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="(11) 99999-0000"/></Field><Field label="Nome"><Input aria-label="Nome" value={nome} onChange={e=>setNome(e.target.value)}/></Field><Field label="Mensagem"><Textarea aria-label="Mensagem simulada" value={recebida} onChange={e=>setRecebida(e.target.value)} maxLength={4000}/></Field><Button disabled={ocupado||!recebida.trim()||!telefone} onClick={simularEntrada}><FlaskConical/>{ocupado?'Processando…':'Simular'}</Button></DialogContent></Dialog>
  </>;
}