import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { MessageCircle, Send, FlaskConical, UserCheck, Sparkles, UserPlus, Settings, Pause, Play, Siren, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, Field, Pill, selectCls, errMsg } from '@/components/kit';
import { dadosWhatsApp, agirWhatsApp, simularWhatsApp, salvarConfigIris } from '@/lib/whatsapp.functions';
import { supabase } from '@/integrations/supabase/client';
import { equipeHead } from '@/lib/page-head';
import { dataHoraBR } from '@/lib/format';
import { cn } from '@/lib/utils';

const options=(userId:string)=>queryOptions({queryKey:['whatsapp',userId],queryFn:()=>dadosWhatsApp(),refetchInterval:10_000});
const ESTADO_ROBO: Record<string,string>={pendente:'aguardando',processando:'processando',respondido:'respondeu',concluido:'concluído',falha:'falhou'};
const DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
type Config=NonNullable<Awaited<ReturnType<typeof dadosWhatsApp>>['config']>;
type Horario=Record<string,[string,string]>;
const segundos=(ms:number|null)=>ms==null?'':`${(ms/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} s`;

export const Route=createFileRoute('/_authenticated/admin/whatsapp')({head:()=>equipeHead('WhatsApp','Conversas, atendimento da Íris e simulação WhatsApp da Horus.'),loader:({context})=>context.queryClient.ensureQueryData(options(context.user.id)),component:WhatsApp});

function WhatsApp(){
  const {user}=Route.useRouteContext();const {data}=useSuspenseQuery(options(user.id));const qc=useQueryClient();
  const agir=useServerFn(agirWhatsApp);const simular=useServerFn(simularWhatsApp);const salvarConfig=useServerFn(salvarConfigIris);
  const [id,setId]=useState('');const [filtro,setFiltro]=useState('');const [busca,setBusca]=useState('');const [texto,setTexto]=useState('');const [ocupado,setOcupado]=useState(false);const [sim,setSim]=useState(false);const [telefone,setTelefone]=useState('');const [nome,setNome]=useState('');const [recebida,setRecebida]=useState('');const [cfgAberta,setCfgAberta]=useState(false);
  const c=data.conversas.find(x=>x.id===id);
  const conectado=data.integracao.modo==='conectado';
  const {data:mensagens=[]}=useQuery({queryKey:['whatsapp-mensagens',user.id,id],enabled:Boolean(id),queryFn:async()=>{const r=await supabase.from('whatsapp_mensagens').select('*').eq('conversa_id',id).order('created_at');if(r.error)throw r.error;const entradas=r.data.filter(m=>m.direcao==='entrada').map(m=>m.id);const j=entradas.length?await supabase.from('whatsapp_bot_jobs').select('mensagem_id,status,erro').in('mensagem_id',entradas):{data:[],error:null};if(j.error)throw j.error;const jobs=new Map(j.data.map(x=>[x.mensagem_id,x]));return r.data.map(m=>({...m,job:jobs.get(m.id)??null}));},refetchInterval:5000});
  const {data:acoes=[]}=useQuery({queryKey:['whatsapp-acoes',user.id,id],enabled:Boolean(id),queryFn:async()=>{const r=await supabase.from('whatsapp_acoes').select('id,acao,descricao,antes,depois,created_at').eq('conversa_id',id).order('created_at',{ascending:false}).limit(30);if(r.error)throw r.error;return r.data;},refetchInterval:10_000});
  const recarregar=async()=>{await Promise.all([qc.invalidateQueries({queryKey:['whatsapp',user.id]}),qc.invalidateQueries({queryKey:['whatsapp-mensagens',user.id]}),qc.invalidateQueries({queryKey:['whatsapp-acoes',user.id]})]);};
  async function acao(tipo:'assumir'|'bot'|'lida'|'lead'|'responder'|'vincular'|'resolver_urgencia',clienteId?:string){
    setOcupado(true);try{await agir({data:{id,acao:tipo,texto:tipo==='responder'?texto:undefined,clienteId:clienteId || null}});if(tipo==='responder')setTexto('');await recarregar();}catch(e){toast.error(errMsg(e));}finally{setOcupado(false);}
  }
  async function simularEntrada(){setOcupado(true);try{const r=await simular({data:{telefone,nome,texto:recebida}});setId(r.conversaId);setRecebida('');setSim(false);await recarregar();}catch(e){toast.error(errMsg(e));}finally{setOcupado(false);}}
  async function gravarConfig(cfg:Config){setOcupado(true);try{await salvarConfig({data:{iris_ativa:cfg.iris_ativa,horario:cfg.horario as Horario,plantao_telefone:cfg.plantao_telefone||null,endereco_aprovacao_humana:cfg.endereco_aprovacao_humana,limite_mensagens_minuto:cfg.limite_mensagens_minuto,visita_horarios:cfg.visita_horarios,visita_duracao_min:cfg.visita_duracao_min}});toast.success('Configurações salvas.');await recarregar();return true;}catch(e){toast.error(errMsg(e));return false;}finally{setOcupado(false);}}
  const webhook=typeof window==='undefined'?'':`${window.location.origin}/api/public/whatsapp/webhook`;
  const irisAtiva=data.config?.iris_ativa??true;
  const urgentes=data.conversas.filter(x=>x.urgente).length;
  return <>
    <PageHeader title="WhatsApp" actions={<>
      <Pill tone={conectado?'success':'warning'}>{conectado?'Conectado':'Simulação'}</Pill>
      {data.config&&<Button variant={irisAtiva?'outline':'default'} disabled={ocupado} onClick={()=>gravarConfig({...data.config!,iris_ativa:!irisAtiva})}>{irisAtiva?<Pause/>:<Play/>}{irisAtiva?'Pausar a Íris':'Reativar a Íris'}</Button>}
      {data.config&&<Button variant="outline" onClick={()=>setCfgAberta(true)}><Settings/>Configurações</Button>}
      <Button variant="outline" onClick={()=>setSim(true)}><FlaskConical/>Simular mensagem recebida</Button>
    </>}/>
    {!irisAtiva&&<div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">A Íris está <strong>pausada</strong>: as mensagens chegam aqui, mas ninguém responde automaticamente.</div>}
    {urgentes>0&&<div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><Siren className="h-4 w-4"/>{urgentes===1?'1 conversa URGENTE':`${urgentes} conversas URGENTES`} aguardando a equipe.</div>}
    <div className="mb-4 border-b border-border pb-4 text-sm"><span className="text-muted-foreground">Webhook Meta: </span><span className="break-all select-all">{webhook}</span></div>
    <div className="grid min-h-[650px] border border-border rounded-lg md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b border-border md:border-b-0 md:border-r">
        <div className="space-y-2 border-b border-border p-3"><Input aria-label="Buscar conversa" placeholder="Nome ou telefone" value={busca} onChange={e=>setBusca(e.target.value)}/><select aria-label="Filtrar atendimento" className={selectCls} value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="">Íris e humano</option><option value="bot">Íris</option><option value="humano">Humano</option><option value="urgente">Urgentes</option></select></div>
        <div className="max-h-[480px] overflow-y-auto">{data.conversas.filter(x=>(!filtro||(filtro==='urgente'?x.urgente:x.modo===filtro))&&`${x.nome} ${x.telefone}`.toLowerCase().includes(busca.toLowerCase())).sort((a,b)=>Number(b.urgente)-Number(a.urgente)).map(x=><Button key={x.id} variant="ghost" className={cn('h-auto w-full justify-start rounded-none border-b border-border px-4 py-3 text-left',id===x.id&&'bg-accent')} onClick={async()=>{setId(x.id);try{await agir({data:{id:x.id,acao:'lida'}});await recarregar();}catch(e){toast.error(errMsg(e));}}}><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.nome||x.telefone}</span><span className="flex gap-1">{x.urgente&&<Pill tone="danger">URGENTE</Pill>}{x.nao_lidas>0&&<Pill tone="gold">{x.nao_lidas}</Pill>}</span></div><p className="truncate text-xs text-muted-foreground">{x.ultima_mensagem}</p><p className="mt-1 text-xs text-muted-foreground">{x.modo==='bot'?'Íris':'Humano'} · {dataHoraBR(x.ultima_mensagem_em)}</p></div></Button>)}{!data.conversas.length&&<p className="p-5 text-sm text-muted-foreground">Nenhuma conversa.</p>}</div>
      </aside>
      {c?<section className="flex min-w-0 flex-col"><header className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold">{c.nome||c.telefone}{c.urgente&&<Pill tone="danger">URGENTE</Pill>}</h2><p className="text-xs text-muted-foreground">{c.telefone} · {c.modo==='bot'?'Atendida pela Íris':'Atendente humano'}</p></div>
            <div className="flex flex-wrap gap-2">{c.urgente&&<Button size="sm" variant="outline" disabled={ocupado} onClick={()=>acao('resolver_urgencia')}><Siren/>Resolver urgência</Button>}<Button size="sm" variant="outline" disabled={ocupado} onClick={()=>acao(c.modo==='bot'?'assumir':'bot')}>{c.modo==='bot'?<UserCheck/>:<Sparkles/>}{c.modo==='bot'?'Assumir':'Devolver para a Íris'}</Button>{!c.cliente_id&&!c.lead_id&&<Button size="sm" variant="outline" disabled={ocupado} onClick={()=>acao('lead')}><UserPlus/>Criar lead</Button>}</div></div>
          <div><select aria-label="Vincular a cliente" className={selectCls} value={c.cliente_id??''} disabled={ocupado} onChange={e=>acao('vincular',e.target.value)}><option value="">Contato não vinculado</option>{data.clientes.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select>{c.lead_id&&<p className="mt-1 text-xs text-muted-foreground">Lead criado</p>}</div>
          {c.modo==='humano'&&c.resumo_transferencia&&<div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"><p className="mb-1 text-xs font-semibold text-primary">Resumo deixado pela Íris{c.transferida_em?` · ${dataHoraBR(c.transferida_em)}`:''}</p><p className="whitespace-pre-wrap break-words">{c.resumo_transferencia}</p></div>}
          {acoes.length>0&&<details className="rounded-lg border border-border p-3 text-sm"><summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground"><ClipboardList className="h-4 w-4"/>Ações da Íris nesta conversa ({acoes.length})</summary><ul className="mt-2 space-y-1">{acoes.map(a=><li key={a.id} className="text-xs"><span className="text-muted-foreground">{dataHoraBR(a.created_at)}</span> · {a.descricao}{a.antes||a.depois?<span className="text-muted-foreground"> {a.antes?`antes: ${JSON.stringify(a.antes)} `:''}{a.depois?`depois: ${JSON.stringify(a.depois)}`:''}</span>:null}</li>)}</ul></details>}
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 max-h-[520px]" aria-label="Mensagens WhatsApp">{mensagens.map(m=><div key={m.id} className={cn('flex',m.direcao==='saida'?'justify-end':'justify-start')}><div className={cn('max-w-[88%] rounded-lg border px-3 py-2',m.direcao==='saida'?'border-primary/20 bg-primary/10':'border-border bg-card')}><p className="text-xs text-muted-foreground">{m.remetente==='ia'?'Íris (IA)':m.remetente==='atendente'?'Equipe Horus':c.nome||'Cliente'}</p><p className="whitespace-pre-wrap break-words text-sm">{m.texto}</p><p className="mt-1 text-right text-xs text-muted-foreground">{dataHoraBR(m.created_at)} · {m.status==='accepted'?'Aceita pela Meta':m.status}{m.tempo_resposta_ms!=null?` · respondeu em ${segundos(m.tempo_resposta_ms)}`:''}</p>{m.erro&&<p className="mt-1 break-words text-xs text-destructive">{m.erro}</p>}{m.job&&(m.job.erro||m.job.status!=='concluido')&&<p className={cn('mt-1 break-words text-xs',m.job.status==='falha'?'text-destructive':m.job.erro?'text-amber-500':'text-muted-foreground')}>Íris: {ESTADO_ROBO[m.job.status]??m.job.status}{m.job.erro?` — ${m.job.erro}`:''}</p>}</div></div>)}</div>
        <footer className="space-y-2 border-t border-border p-4"><Textarea aria-label="Resposta do atendente" placeholder="Escreva sua resposta… (ao enviar, você assume a conversa e a Íris fica em silêncio)" value={texto} maxLength={4000} onChange={e=>setTexto(e.target.value)}/><div className="flex justify-end"><Button disabled={ocupado||!texto.trim()} onClick={()=>acao('responder')}><Send/>Enviar</Button></div></footer>
      </section>:<section className="flex items-center justify-center p-8 text-muted-foreground"><MessageCircle className="mr-2 h-5 w-5"/>Nenhuma conversa selecionada</section>}
    </div>
    <Dialog open={sim} onOpenChange={setSim}><DialogContent><DialogHeader><DialogTitle>Simular mensagem recebida</DialogTitle></DialogHeader>
      {conectado&&<p className="text-sm text-muted-foreground">Com o WhatsApp conectado, use um número de teste com DDD 00, por exemplo (00) 99999-0001. A Íris responde aqui, sem enviar nada pelo WhatsApp. Para testar como cliente cadastrado, cadastre um cliente de teste com esse número.</p>}
      <Field label="Telefone"><Input aria-label="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder={conectado?'(00) 99999-0001':'(11) 99999-0000'}/></Field><Field label="Nome"><Input aria-label="Nome" value={nome} onChange={e=>setNome(e.target.value)}/></Field><Field label="Mensagem"><Textarea aria-label="Mensagem simulada" value={recebida} onChange={e=>setRecebida(e.target.value)} maxLength={4000}/></Field><Button disabled={ocupado||!recebida.trim()||!telefone} onClick={simularEntrada}><FlaskConical/>{ocupado?'A Íris está respondendo…':'Simular'}</Button></DialogContent></Dialog>
    {data.config&&<ConfigIris aberta={cfgAberta} fechar={()=>setCfgAberta(false)} inicial={data.config} ocupado={ocupado} salvar={gravarConfig}/>}
  </>;
}

function ConfigIris({aberta,fechar,inicial,ocupado,salvar}:{aberta:boolean;fechar:()=>void;inicial:Config;ocupado:boolean;salvar:(c:Config)=>Promise<boolean>}){
  const [cfg,setCfg]=useState<Config>(inicial);
  const horario=cfg.horario as Horario;
  const setDia=(d:number,v:[string,string]|null)=>{const h={...horario};if(v)h[String(d)]=v;else delete h[String(d)];setCfg({...cfg,horario:h});};
  return <Dialog open={aberta} onOpenChange={(o)=>{if(o)setCfg(inicial);else fechar();}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Configurações da Íris</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-3 text-sm"><span>Íris atendendo</span><Switch checked={cfg.iris_ativa} onCheckedChange={v=>setCfg({...cfg,iris_ativa:v})}/></label>
      <div><p className="mb-2 text-sm font-medium">Horário de atendimento humano</p><div className="space-y-2">{[1,2,3,4,5,6,0].map(d=>{const f=horario[String(d)];return <div key={d} className="flex flex-wrap items-center gap-2 text-sm"><label className="flex w-28 items-center gap-2"><Switch checked={Boolean(f)} onCheckedChange={v=>setDia(d,v?['08:00','18:00']:null)}/>{DIAS[d]}</label>{f?<><Input type="time" className="w-28" value={f[0]} onChange={e=>setDia(d,[e.target.value,f[1]])}/><span>às</span><Input type="time" className="w-28" value={f[1]} onChange={e=>setDia(d,[f[0],e.target.value])}/></>:<span className="text-muted-foreground">fechado</span>}</div>;})}</div></div>
      <Field label="Celular do plantão (alertas de URGENTE)"><Input value={cfg.plantao_telefone??''} placeholder="(27) 99999-0000" onChange={e=>setCfg({...cfg,plantao_telefone:e.target.value})}/></Field>
      <label className="flex items-center justify-between gap-3 text-sm"><span>Alteração de endereço precisa de aprovação humana</span><Switch checked={cfg.endereco_aprovacao_humana} onCheckedChange={v=>setCfg({...cfg,endereco_aprovacao_humana:v})}/></label>
      <Field label="Horários de início das visitas técnicas (separados por vírgula)"><Input value={cfg.visita_horarios.join(', ')} onChange={e=>setCfg({...cfg,visita_horarios:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Duração da visita (min)"><Input type="number" min={30} max={480} value={cfg.visita_duracao_min} onChange={e=>setCfg({...cfg,visita_duracao_min:Number(e.target.value)})}/></Field><Field label="Máx. respostas por minuto"><Input type="number" min={1} max={60} value={cfg.limite_mensagens_minuto} onChange={e=>setCfg({...cfg,limite_mensagens_minuto:Number(e.target.value)})}/></Field></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={fechar}>Cancelar</Button><Button disabled={ocupado} onClick={async()=>{if(await salvar(cfg))fechar();}}>Salvar</Button></div>
    </div>
  </DialogContent></Dialog>;
}
