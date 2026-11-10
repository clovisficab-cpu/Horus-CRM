// Regras determinísticas da Íris (sem IA): emergência, identificação, horário, divisão de respostas.

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const semAcento = sem;

/** Relato de crime em andamento, invasão, incêndio ou risco à vida. */
export function detectarEmergencia(texto: string) {
  return /\b(ladr[aã]o|ladroes|assalt\w*|roub(ando|aram|o agora)|invas[aã]o|invadi\w*|arromb\w*|inc[eê]ndio|pegando fogo|fogo aqui|socorro|tiro(s|teio)?|arma(do)?|sequestr\w*|desmai\w*|infarto|ferid[oa]|sangrando|me ajudem|estou em perigo)\b/i.test(texto);
}

/** Pedido explícito de humano, irritação ou assuntos que vão sempre para a equipe. */
export function exigeHumano(texto: string) {
  const t = sem(texto);
  return /\b(humano|atendente|pessoa de verdade|falar com alguem|cancelar (o |meu )?contrato|cancelamento|negociar|negociacao|desconto|parcelar|parcelamento|multa|advogad\w*|processo judicial|procon)\b/.test(t)
    || /\b(irritad[oa]|absurdo|pessim[oa]|ridiculo|palhacada|vergonha)\b/.test(t);
}

/** Pedido de gravação/imagens: sempre vira chamado para humano, nunca é enviado pelo WhatsApp. */
export function pedeGravacao(texto: string) {
  return /\b(grava[cç](ao|oes|ão|ões)|video|vídeo|imagens?|print)\b.*\b(ontem|hoje|dia|noite|furto|roubo|mand|envi|pass)/i.test(texto)
    || /\b(mand|envi|pass)\w*\b.*\b(video|vídeo|grava[cç]\w*|imagens?)\b/i.test(texto);
}

/**
 * Confere o 2º fator: os 3 primeiros dígitos do CPF/CNPJ ou o nome completo do titular.
 * Nome: todas as palavras do cadastro (ignorando acentos, maiúsculas e "de/da/dos").
 */
export function fatorConfere(resposta: string, cliente: { nome: string; documento: string | null }) {
  const digitos = resposta.replace(/\D/g, '');
  const doc = (cliente.documento ?? '').replace(/\D/g, '');
  if (digitos.length === 3 && doc.length >= 11) return doc.slice(0, 3) === digitos;
  if (digitos.length > 0) return false;
  const palavras = (t: string) => sem(t).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((p) => p.length > 0 && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p));
  const informado = palavras(resposta);
  const cadastro = palavras(cliente.nome);
  return cadastro.length >= 2 && informado.length === cadastro.length && cadastro.every((p, i) => informado[i] === p);
}

/** A mensagem do cliente é uma confirmação explícita ("sim", "pode", "confirmo", "pode agendar"…)? */
export function confirmacao(texto: string) {
  const t = sem(texto).trim().replace(/[!.,]+$/g, '');
  if (/\b(nao|nunca|espera|calma|outro|outra|mudar|troca)\b/.test(t)) return false;
  return /^(sim|s|ss|isso|pode|pode sim|ok|okay|blz|beleza|certo|correto|confirmo|confirmado|confirma|claro|com certeza|fechado|perfeito|exato|isso mesmo|por favor|pode ser|bora|manda ver)\b/.test(t)
    || /^(sim,? )?(pode|pode sim,?) (agendar|abrir|cancelar|reagendar|marcar|confirmar)\b/.test(t);
}

export const primeiroNome = (nome: string | null | undefined) => (nome ?? '').trim().split(/\s+/)[0] ?? '';

export type Horario = Record<string, [string, string]>;
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Hora local de São Paulo. */
export function agoraSP(agora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(agora).map((x) => [x.type, x.value]));
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p['weekday'] ?? '');
  return { dia, hora: `${p['hour']}:${p['minute']}` };
}

/** Está dentro do horário de atendimento humano? */
export function dentroDoHorario(horario: Horario, agora = new Date()) {
  const { dia, hora } = agoraSP(agora);
  const faixa = horario[String(dia)];
  return Boolean(faixa && hora >= faixa[0] && hora < faixa[1]);
}

const h = (x: string) => x.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');

/** Texto do horário de atendimento, por exemplo "segunda a sexta, das 8h às 18h; sábado, das 8h às 12h". */
export function descreverHorario(horario: Horario) {
  const grupos: { dias: number[]; faixa: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const dia = d % 7;
    const f = horario[String(dia)];
    if (!f) continue;
    const faixa = `das ${h(f[0])} às ${h(f[1])}`;
    const ultimo = grupos[grupos.length - 1];
    const anterior = ultimo?.dias[ultimo.dias.length - 1];
    if (ultimo && ultimo.faixa === faixa && anterior !== undefined && (anterior + 1) % 7 === dia) ultimo.dias.push(dia);
    else grupos.push({ dias: [dia], faixa });
  }
  return grupos.map((g) => `${g.dias.length > 1 ? `${DIAS[g.dias[0]!]} a ${DIAS[g.dias[g.dias.length - 1]!]}` : DIAS[g.dias[0]!]}, ${g.faixa}`).join('; ');
}

/** Quando a equipe volta (para fora do horário). */
export function proximaAbertura(horario: Horario, agora = new Date()) {
  const { dia, hora } = agoraSP(agora);
  for (let i = 0; i < 8; i++) {
    const d = (dia + i) % 7;
    const f = horario[String(d)];
    if (!f) continue;
    if (i === 0 && hora >= f[0]) continue;
    return `${i === 0 ? 'hoje' : i === 1 ? 'amanhã' : DIAS[d]}, às ${h(f[0])}`;
  }
  return null;
}

/** Divide a resposta em até 3 mensagens curtas (por parágrafo; se preciso, por frase). */
export function dividirResposta(texto: string, maxPartes = 3, maxTotal = 1500) {
  const limpo = texto.replace(/\r/g, '').trim().slice(0, maxTotal);
  let partes = limpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (partes.length === 1 && limpo.length > 320) {
    const frases = limpo.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((f) => f.trim()).filter(Boolean) ?? [limpo];
    partes = [];
    for (const f of frases) {
      const ultima = partes[partes.length - 1];
      if (ultima && ultima.length + f.length < 280) partes[partes.length - 1] = `${ultima} ${f}`;
      else partes.push(f);
    }
  }
  while (partes.length > maxPartes) {
    const [a, b] = partes.splice(partes.length - 2, 2);
    partes.push(`${a}\n\n${b}`);
  }
  return partes;
}

/** Pausa com "digitando…" entre partes: 1 a 2 s, proporcional ao tamanho. */
export const pausaEntrePartes = (parte: string) => Math.min(2000, 1000 + parte.length * 4);

/** Remove formatação Markdown que o WhatsApp não usa (** e títulos). */
export function paraWhatsApp(texto: string) {
  return texto.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• ').trim();
}

export const MSG_FALHA = 'Tive um problema aqui e já chamei alguém da equipe Horus para continuar com você. Só um instante, por favor.';
export const MSG_AGUARDE = 'Só um instante, já estou verificando 👀';
export function msgEmergencia(nome?: string) {
  return `${nome ? `${nome}, ` : ''}se você ou alguém corre perigo agora, ligue imediatamente para 190 (Polícia), 193 (Bombeiros) ou 192 (SAMU). Já avisei a equipe Horus com prioridade máxima.`;
}
