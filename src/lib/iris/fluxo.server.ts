import { supabaseAdmin as db } from '@/integrations/supabase/client.server';
import type { Json } from '@/integrations/supabase/types';
import { chaveIA, modeloIA, modeloReserva } from '@/lib/ai/responses.server';
import { obterProvedor } from '@/lib/whatsapp/provider.server';
import { enviarPendente } from '@/lib/whatsapp/bot.server';
import { turnoComRegras, type EstadoAtendimento, type RepositorioIris } from './agente.server';
import { MSG_AGUARDE, MSG_FALHA, dentroDoHorario, descreverHorario, dividirResposta, paraWhatsApp, pausaEntrePartes, proximaAbertura, type Horario } from './regras';

/** Espera sem novas mensagens antes de responder (agrupa "oi" / "minha câmera" / "parou"). */
export const ESPERA_LOTE_MS = 3_000;
/** Atendimento sem interação por mais que isso expira (e a identificação junto). */
const INATIVIDADE_MS = 10 * 60_000;
/** Lote em processamento há mais que isso foi interrompido. */
const INTERROMPIDO_MS = 2 * 60_000;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const erro = (e: { message?: string } | null | undefined) => { if (e) throw new Error(e.message ?? 'Erro no banco'); };
/** Banco ainda sem a migração 0008 (função, tabela ou coluna inexistente): a Íris fica inativa, sem quebrar o resto. */
const semMigracao = (e: { code?: string } | null | undefined) => Boolean(e?.code && ['PGRST202', 'PGRST204', 'PGRST205', '42883', '42703', '42P01'].includes(e.code));
const AVISO_MIGRACAO = '[iris] migração 0008_iris.sql ainda não aplicada no Supabase: Íris inativa; mensagens ficam para a equipe.';

async function config() {
  const r = await db.from('whatsapp_config').select('*').eq('id', true).single();
  erro(r.error);
  return r.data!;
}

/** Mensagem avulsa da Íris (ex.: "Só um instante…"), registrada e enviada. */
async function enviarAvulsa(conversaId: string, texto: string) {
  const r = await db.from('whatsapp_mensagens').insert({ conversa_id: conversaId, direcao: 'saida', remetente: 'ia', texto, status: 'pendente' }).select('id').single();
  if (!r.error && r.data) await enviarPendente(r.data.id);
}

/** Atendimento aberto da conversa; expira por inatividade e lembra o assunto do anterior (até 24 h). */
async function atendimentoAtual(conversaId: string) {
  const aberto = await db.from('whatsapp_atendimentos').select('*').eq('conversa_id', conversaId).eq('status', 'aberto').maybeSingle();
  erro(aberto.error);
  if (aberto.data && Date.now() - Date.parse(aberto.data.ultima_interacao_em) < INATIVIDADE_MS) return { at: aberto.data, retomada: null as string | null };
  if (aberto.data) {
    const f = await db.from('whatsapp_atendimentos').update({ status: 'encerrado_inatividade', encerrado_em: new Date().toISOString() }).eq('id', aberto.data.id).eq('status', 'aberto');
    erro(f.error);
  }
  const anterior = await db.from('whatsapp_atendimentos').select('assunto,resumo').eq('conversa_id', conversaId).neq('status', 'aberto').gte('iniciado_em', new Date(Date.now() - 86_400_000).toISOString()).order('iniciado_em', { ascending: false }).limit(1).maybeSingle();
  erro(anterior.error);
  let novo = await db.from('whatsapp_atendimentos').insert({ conversa_id: conversaId }).select('*').single();
  if (novo.error) novo = await db.from('whatsapp_atendimentos').select('*').eq('conversa_id', conversaId).eq('status', 'aberto').single();
  erro(novo.error);
  const r = anterior.data;
  return { at: novo.data!, retomada: r ? [r.assunto, r.resumo].filter(Boolean).join(' — ') || null : null };
}

function repositorio(conversaId: string, atendimentoId: string, plantao: string | null): RepositorioIris {
  const auditar = (cliente: string | null, acao: string, descricao: string, depois?: Json) =>
    db.from('whatsapp_acoes').insert({ conversa_id: conversaId, atendimento_id: atendimentoId, cliente_id: cliente, acao, descricao, depois: depois ?? null });
  return {
    async cliente(id) { const r = await db.from('clientes').select('nome,documento').eq('id', id).maybeSingle(); erro(r.error); return r.data; },
    async cameras(id) { const r = await db.from('cameras').select('nome,local,status').eq('cliente_id', id).order('nome'); erro(r.error); return r.data ?? []; },
    async resumoCliente(id) { const r = await db.rpc('whatsapp_resumo_cliente', { _cliente: id }); erro(r.error); return r.data as unknown as Awaited<ReturnType<RepositorioIris['resumoCliente']>>; },
    async debito(id) {
      const r = await db.from('faturas').select('referencia,valor,vencimento,status').eq('cliente_id', id).in('status', ['em_aberto', 'vencido']).order('vencimento');
      erro(r.error); return (r.data ?? []).map((f) => ({ ...f, valor: Number(f.valor) }));
    },
    async horariosLivres() { const r = await db.rpc('whatsapp_horarios_visita', { _dias: 7, _limite: 6 }); erro(r.error); return (r.data ?? []) as string[]; },
    async abrirChamado(id, d) {
      const r = await db.rpc('whatsapp_abrir_chamado', { _cliente: id, _conversa: conversaId, _atendimento: atendimentoId, _assunto: d.assunto, _descricao: d.descricao, _categoria: d.categoria, _prioridade: d.prioridade });
      erro(r.error); return r.data as { protocolo: number };
    },
    async visita(id, indice, inicio, motivo) {
      let ordem: string | null = null;
      if (indice !== null) {
        const l = await db.from('ordens_servico').select('id').eq('cliente_id', id).eq('status', 'agendada').order('agendada_em').order('id');
        erro(l.error);
        ordem = l.data?.[indice - 1]?.id ?? null;
        if (!ordem) throw new Error('Visita não encontrada. Consulte a lista de visitas de novo.');
      }
      const r = await db.rpc('whatsapp_visita', { _cliente: id, _conversa: conversaId, _atendimento: atendimentoId, _ordem: ordem, _inicio: inicio, _motivo: motivo });
      erro(r.error); return r.data as { agendada_em?: string; tecnico?: string; status?: string };
    },
    async salvarAtendimento(patch) {
      const { acao_pendente, ...resto } = patch;
      const r = await db.from('whatsapp_atendimentos').update(acao_pendente === undefined ? resto : { ...resto, acao_pendente: acao_pendente as unknown as Json }).eq('id', atendimentoId);
      erro(r.error);
    },
    async marcarUrgente(resumo) {
      const r = await db.from('whatsapp_conversas').update({ urgente: true }).eq('id', conversaId);
      erro(r.error);
      await auditar(null, 'urgencia', `URGENTE: ${resumo}`.slice(0, 500));
      if (plantao) {
        // Aviso ao celular do plantão (texto livre: só chega se o plantão conversou com o número da Horus nas últimas 24 h).
        try { await obterProvedor().enviarMensagem(plantao, `🚨 URGENTE na Horus: ${resumo.slice(0, 300)} — veja /admin/whatsapp`); }
        catch (e) { console.error('[iris] aviso ao plantão falhou', e); }
      }
    },
  };
}

/** Responde a uma conversa: reivindica o lote de mensagens, chama a Íris e envia a resposta em partes. */
export async function atenderConversa(conversaId: string, opcoes: { esperaMs?: number } = {}) {
  const lote = await db.rpc('whatsapp_reivindicar_lote', { _conversa: conversaId, _espera_ms: opcoes.esperaMs ?? ESPERA_LOTE_MS });
  if (semMigracao(lote.error)) { console.error(AVISO_MIGRACAO); return; }
  erro(lote.error);
  const jobs = (lote.data ?? []) as string[];
  if (!jobs.length) return;
  const registrar = async (textos: string[], extra: { tempo?: number | null; transferir?: { resumo: string } | null; aviso?: string | null }) => {
    const r = await db.rpc('whatsapp_registrar_resposta', { _conversa: conversaId, _jobs: jobs, _textos: textos, _tempo_ms: extra.tempo ?? null, _transferir: Boolean(extra.transferir), _resumo: extra.transferir?.resumo ?? null, _aviso: extra.aviso ?? null });
    erro(r.error);
    return (r.data ?? []) as string[];
  };
  try {
    const [cfg, conv, jobsInfo] = await Promise.all([
      config(),
      db.from('whatsapp_conversas').select('*').eq('id', conversaId).single(),
      db.from('whatsapp_bot_jobs').select('mensagem_id').in('id', jobs),
    ]);
    erro(conv.error); erro(jobsInfo.error);
    const c = conv.data!;
    if (!cfg.iris_ativa) { await registrar([], { aviso: 'Íris pausada no painel.' }); return; }
    if (c.modo !== 'bot') { await registrar([], {}); return; }
    const recentes = await db.from('whatsapp_mensagens').select('id', { count: 'exact', head: true }).eq('conversa_id', conversaId).eq('remetente', 'ia').gte('created_at', new Date(Date.now() - 60_000).toISOString());
    if ((recentes.count ?? 0) >= cfg.limite_mensagens_minuto) { await registrar([], { aviso: 'Limite de mensagens por minuto atingido.' }); return; }

    const ids = new Set((jobsInfo.data ?? []).map((j) => j.mensagem_id));
    const msgs = await db.from('whatsapp_mensagens').select('id,remetente,texto,created_at,id_externo').eq('conversa_id', conversaId).order('created_at', { ascending: false }).limit(40);
    erro(msgs.error);
    const todas = (msgs.data ?? []).reverse();
    const novas = todas.filter((m) => ids.has(m.id));
    const historico = todas.filter((m) => !ids.has(m.id) && Date.parse(m.created_at) <= Date.parse(novas[0]?.created_at ?? new Date().toISOString())).slice(-30);
    const ultima = novas[novas.length - 1];
    const recebidaEm = Date.parse(ultima?.created_at ?? new Date().toISOString());

    const { at, retomada } = await atendimentoAtual(conversaId);
    const toque = await db.from('whatsapp_atendimentos').update({ ultima_interacao_em: new Date().toISOString() }).eq('id', at.id);
    erro(toque.error);
    const horario = cfg.horario as unknown as Horario;
    const [base, planos] = await Promise.all([
      db.from('base_conhecimento').select('pergunta,resposta,categoria').eq('publicada', true).limit(60),
      db.from('planos').select('nome,descricao,mensalidade,limite_cameras,dias_gravacao,recursos').eq('ativo', true),
    ]);
    erro(base.error); erro(planos.error);

    const key = chaveIA();
    const modelos = key ? [modeloIA(key), modeloIA(key, modeloReserva())] : [];
    const repo = repositorio(conversaId, at.id, cfg.plantao_telefone);
    const r = modelos.length
      ? await turnoComRegras({
          situacao: {
            agora: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
            horarioAtendimento: descreverHorario(horario), equipeDisponivel: dentroDoHorario(horario), proximaAbertura: proximaAbertura(horario),
            nomeWhatsApp: c.nome, urgente: c.urgente, retomada,
          },
          clienteDoTelefone: c.cliente_id,
          atendimento: { cliente_id: at.cliente_id, identificado_em: at.identificado_em, falhas_identificacao: at.falhas_identificacao, acao_pendente: at.acao_pendente as EstadoAtendimento['acao_pendente'], acao_pendente_em: at.acao_pendente_em, estado: at.estado as EstadoAtendimento['estado'], assunto: at.assunto },
          inicioTurno: new Date().toISOString(),
          historico: historico.map((m) => ({ remetente: m.remetente, texto: m.texto })),
          novas: novas.map((m) => m.texto),
          base: base.data, planos: planos.data,
        }, repo, modelos, { aoDemorar: () => { void enviarAvulsa(conversaId, MSG_AGUARDE); } })
      : { texto: MSG_FALHA, transferir: { motivo: 'IA não configurada', resumo: 'AI_API_KEY ausente no servidor.' }, urgente: false, falhou: 'IA não configurada (AI_API_KEY).' };

    const textos = dividirResposta(paraWhatsApp(r.texto));
    const enviadas = await registrar(textos, { tempo: Date.now() - recebidaEm, transferir: r.transferir, aviso: r.falhou ? `IA: ${r.falhou}` : null });
    if (r.transferir) await db.from('whatsapp_acoes').insert({ conversa_id: conversaId, atendimento_id: at.id, cliente_id: at.cliente_id, acao: 'transferir', descricao: `Transferida para atendente: ${r.transferir.motivo}`.slice(0, 500), depois: { resumo: r.transferir.resumo } });
    const provedor = obterProvedor();
    for (const [i, id] of enviadas.entries()) {
      if (i > 0) {
        if (ultima?.id_externo) await provedor.marcarLidaDigitando(ultima.id_externo).catch(() => undefined);
        await dormir(pausaEntrePartes(textos[i] ?? ''));
      }
      await enviarPendente(id);
    }
  } catch (err) {
    console.error('[iris] falha no atendimento', conversaId, err);
    try {
      const ids = await registrar([MSG_FALHA], { transferir: { resumo: `Falha técnica no atendimento da Íris: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000) }, aviso: 'Falha técnica; encaminhado para a equipe.' });
      for (const id of ids) await enviarPendente(id);
    } catch (e) { console.error('[iris] não foi possível registrar a falha', e); }
  }
}

/** Chamado logo depois de gravar a mensagem (em segundo plano): "lida + digitando…", espera o agrupamento e responde. */
export async function aoReceberMensagem(conversaId: string, idExterno: string) {
  await obterProvedor().marcarLidaDigitando(idExterno).catch((e) => console.warn('[iris] digitando falhou', e));
  await dormir(ESPERA_LOTE_MS + 300);
  await atenderConversa(conversaId);
}

/** Rede de segurança do agendador (a cada minuto): lotes interrompidos, mensagens sem resposta e envios pendentes. */
export async function processarPendentes() {
  const presos = await db.from('whatsapp_bot_jobs').select('id, whatsapp_mensagens!mensagem_id(conversa_id)').eq('status', 'processando').lt('iniciado_em', new Date(Date.now() - INTERROMPIDO_MS).toISOString()).limit(20);
  if (semMigracao(presos.error)) { console.error(AVISO_MIGRACAO); return; }
  erro(presos.error);
  const porConversa = new Map<string, string[]>();
  for (const j of presos.data ?? []) { const c = j.whatsapp_mensagens?.conversa_id; if (c) porConversa.set(c, [...(porConversa.get(c) ?? []), j.id]); }
  for (const [conversa, jobs] of porConversa) {
    try {
      const r = await db.rpc('whatsapp_registrar_resposta', { _conversa: conversa, _jobs: jobs, _textos: [MSG_FALHA], _tempo_ms: null, _transferir: true, _resumo: 'Atendimento da Íris interrompido; a conversa precisa de um atendente.', _aviso: 'Processamento interrompido; encaminhado para a equipe.' });
      erro(r.error);
      for (const id of (r.data ?? []) as string[]) await enviarPendente(id);
    } catch (e) { console.error('[iris] falha ao encaminhar lote interrompido', conversa, e); }
  }
  const pendentes = await db.from('whatsapp_bot_jobs').select('whatsapp_mensagens!mensagem_id(conversa_id)').eq('status', 'pendente').lt('created_at', new Date(Date.now() - 15_000).toISOString()).limit(20);
  erro(pendentes.error);
  const conversas = [...new Set((pendentes.data ?? []).map((j) => j.whatsapp_mensagens?.conversa_id).filter((x): x is string => Boolean(x)))];
  const inicio = Date.now();
  for (const c of conversas) {
    if (Date.now() - inicio > 8_000) break;
    try { await atenderConversa(c); } catch (e) { console.error('[iris] falha no atendimento pendente', c, e); }
  }
  const mensagens = await db.from('whatsapp_mensagens').select('id').eq('status', 'pendente').lt('created_at', new Date(Date.now() - 30_000).toISOString()).order('created_at').limit(10);
  erro(mensagens.error);
  for (const m of mensagens.data ?? []) { try { await enviarPendente(m.id); } catch (e) { console.error('[iris] falha no envio', m.id, e); } }
}
