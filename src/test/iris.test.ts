import { describe, it, expect, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { confirmacao, dentroDoHorario, descreverHorario, detectarEmergencia, dividirResposta, exigeHumano, fatorConfere, pedeGravacao, proximaAbertura, type Horario } from '@/lib/iris/regras';
import { executarTurno, extrairEstado, turnoComRegras, type EntradaTurno, type RepositorioIris } from '@/lib/iris/agente.server';

const horario: Horario = { '1': ['08:00', '18:00'], '2': ['08:00', '18:00'], '3': ['08:00', '18:00'], '4': ['08:00', '18:00'], '5': ['08:00', '18:00'], '6': ['08:00', '12:00'] };

describe('regras da Íris', () => {
  it('detecta emergência sem confundir com assuntos comuns', () => {
    for (const t of ['tem um ladrão aqui agora', 'estão invadindo minha casa', 'socorro', 'a casa está pegando fogo']) expect(detectarEmergencia(t), t).toBe(true);
    for (const t of ['minha câmera parou', 'quanto eu devo?', 'quero agendar visita', 'me ajuda a fazer uma redação']) expect(detectarEmergencia(t), t).toBe(false);
  });
  it('identifica pedidos que vão para humano e pedidos de gravação', () => {
    for (const t of ['quero cancelar o contrato', 'quero falar com um atendente', 'dá pra parcelar?', 'isso é um absurdo']) expect(exigeHumano(t), t).toBe(true);
    expect(exigeHumano('minha câmera parou')).toBe(false);
    for (const t of ['me manda o vídeo de ontem', 'preciso da gravação de ontem à noite, teve um furto']) expect(pedeGravacao(t), t).toBe(true);
    expect(pedeGravacao('a imagem da câmera está ruim')).toBe(false);
  });
  it('confere o 2º fator: 3 primeiros dígitos do documento ou nome completo', () => {
    const c = { nome: 'Clovis da Silva Ficab', documento: '123.456.789-09' };
    expect(fatorConfere('123', c)).toBe(true);
    expect(fatorConfere('124', c)).toBe(false);
    expect(fatorConfere('123456', c)).toBe(false);
    expect(fatorConfere('clóvis silva ficab', c)).toBe(true);
    expect(fatorConfere('Clovis', c)).toBe(false);
    expect(fatorConfere('Maria Silva Ficab', c)).toBe(false);
    expect(fatorConfere('123', { nome: 'X Y', documento: null })).toBe(false);
  });
  it('só aceita confirmação explícita', () => {
    for (const t of ['sim', 'Sim!', 'pode', 'pode agendar', 'ok', 'confirmo', 'isso mesmo', 'pode sim']) expect(confirmacao(t), t).toBe(true);
    for (const t of ['quero agendar a visita', 'não', 'sim, mas em outro horário', 'qual o valor?']) expect(confirmacao(t), t).toBe(false);
  });
  it('descreve o horário e sabe quando a equipe volta', () => {
    expect(descreverHorario(horario)).toBe('segunda a sexta, das 8h às 18h; sábado, das 8h às 12h');
    const domingo = new Date('2026-11-15T15:00:00Z'); // domingo 12h em SP
    expect(dentroDoHorario(horario, domingo)).toBe(false);
    expect(proximaAbertura(horario, domingo)).toBe('amanhã, às 8h');
    expect(dentroDoHorario(horario, new Date('2026-11-16T13:00:00Z'))).toBe(true); // segunda 10h
  });
  it('divide respostas longas em até 3 mensagens', () => {
    expect(dividirResposta('Oi!\n\nTudo bem?\n\nPosso ajudar?\n\nMais uma.')).toHaveLength(3);
    expect(dividirResposta('Curta.')).toEqual(['Curta.']);
  });
  it('lê e remove a marcação de estado', () => {
    expect(extrairEstado('Qual horário prefere?\n#estado:aguardando_cliente #assunto:visita')).toEqual({ texto: 'Qual horário prefere?', estado: 'aguardando_cliente', assunto: 'visita' });
    expect(extrairEstado('Pronto, agendado.').estado).toBe('resolvida');
  });
});

// Modelo simulado: cada chamada devolve o próximo passo do roteiro.
type Passo = { ferramenta: string; entrada: object } | { texto: string };
function modelo(roteiro: Passo[]) {
  let i = 0;
  const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const p = roteiro[Math.min(i++, roteiro.length - 1)]!;
      return 'ferramenta' in p
        ? { content: [{ type: 'tool-call', toolCallId: `c${i}`, toolName: p.ferramenta, input: JSON.stringify(p.entrada) }], finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage, warnings: [] }
        : { content: [{ type: 'text', text: p.texto }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] };
    },
  });
}
function repoFalso() {
  const visita = vi.fn(async () => ({ agendada_em: '2026-11-11T11:00:00Z', tecnico: 'Marcos' }));
  const repo: RepositorioIris = {
    cliente: async () => ({ nome: 'Clovis Ficab', documento: '12345678909' }), cameras: async () => [], resumoCliente: async () => ({ chamados: [], visitas: [] }),
    debito: async () => [], horariosLivres: async () => ['2026-11-11T11:00:00Z'], abrirChamado: async () => ({ protocolo: 1 }), visita,
    salvarAtendimento: async () => undefined, marcarUrgente: vi.fn(async () => undefined),
  };
  return { repo, visita };
}
const entrada = (novas: string[], at: Partial<EntradaTurno['atendimento']> = {}, inicioTurno = new Date().toISOString()): EntradaTurno => ({
  situacao: { agora: 'agora', horarioAtendimento: descreverHorario(horario), equipeDisponivel: true, proximaAbertura: null, nomeWhatsApp: 'Clovis', urgente: false, retomada: null },
  clienteDoTelefone: 'c1', inicioTurno, historico: [], novas, base: [], planos: [],
  atendimento: { cliente_id: 'c1', identificado_em: '2026-11-10T10:00:00Z', falhas_identificacao: 0, acao_pendente: null, acao_pendente_em: null, estado: null, assunto: null, ...at },
});

describe('Íris: ações só com confirmação e só para o cliente identificado', () => {
  const agendar = { ferramenta: 'agendar_visita', entrada: { horario_iso: '2026-11-11T11:00:00Z', motivo: 'câmera offline' } };
  it('primeira chamada pede confirmação; não executa', async () => {
    const { repo, visita } = repoFalso();
    const e = entrada(['quero o primeiro horário']);
    await executarTurno(e, repo, [modelo([agendar, { texto: 'Posso agendar para quarta, 11/11, às 8h?' }])]);
    expect(visita).not.toHaveBeenCalled();
    expect(e.atendimento.acao_pendente?.ferramenta).toBe('agendar_visita');
  });
  it('executa no turno seguinte quando o cliente diz "sim"', async () => {
    const { repo, visita } = repoFalso();
    const antes = new Date(Date.now() - 60_000).toISOString();
    const e = entrada(['sim'], { acao_pendente: { ferramenta: 'agendar_visita', chave: '2026-11-11T11:00:00Z', resumo: '' }, acao_pendente_em: antes });
    await executarTurno(e, repo, [modelo([agendar, { texto: 'Agendado!' }])]);
    expect(visita).toHaveBeenCalledWith('c1', null, '2026-11-11T11:00:00Z', 'câmera offline');
  });
  it('não executa se a última mensagem não for uma confirmação explícita', async () => {
    const { repo, visita } = repoFalso();
    const e = entrada(['quero agendar a visita'], { acao_pendente: { ferramenta: 'agendar_visita', chave: '2026-11-11T11:00:00Z', resumo: '' }, acao_pendente_em: new Date(Date.now() - 60_000).toISOString() });
    await executarTurno(e, repo, [modelo([agendar, { texto: 'Posso agendar?' }])]);
    expect(visita).not.toHaveBeenCalled();
  });
  it('executa quando o cliente diz "sim" à pergunta da Íris com o mesmo dia e hora', async () => {
    const { repo, visita } = repoFalso();
    const e = entrada(['sim, pode agendar']);
    e.historico = [{ remetente: 'ia', texto: 'Posso agendar a visita para quarta-feira, 11/11, às 8h?' }];
    await executarTurno(e, repo, [modelo([agendar, { texto: 'Agendado!' }])]);
    expect(visita).toHaveBeenCalledTimes(1);
  });
  it('não executa se a pergunta da Íris citava outro horário', async () => {
    const { repo, visita } = repoFalso();
    const e = entrada(['sim']);
    e.historico = [{ remetente: 'ia', texto: 'Posso agendar a visita para quarta-feira, 11/11, às 10h?' }];
    await executarTurno(e, repo, [modelo([agendar, { texto: 'Posso agendar às 8h?' }])]);
    expect(visita).not.toHaveBeenCalled();
  });
  it('número sem cadastro: as ferramentas da conta nem são oferecidas à IA', async () => {
    const { repo } = repoFalso();
    const m = modelo([{ texto: 'Posso te ajudar com nossos planos.' }]);
    const e = entrada(['quanto eu devo?'], { cliente_id: null, identificado_em: null });
    e.clienteDoTelefone = null;
    await executarTurno(e, repo, [m]);
    const nomes = (m.doGenerateCalls[0]?.tools ?? []).map((t) => t.name);
    expect(nomes).not.toContain('consultar_debito');
    expect(nomes).not.toContain('verificar_identidade');
  });
  it('cadastrado mas não identificado: a ferramenta da conta recusa até a identidade conferir', async () => {
    const { repo } = repoFalso();
    const debito = vi.spyOn(repo, 'debito');
    await executarTurno(entrada(['quanto eu devo?'], { cliente_id: null, identificado_em: null }), repo, [modelo([{ ferramenta: 'consultar_debito', entrada: {} }, { texto: 'Me informe os 3 primeiros dígitos do CPF.' }])]);
    expect(debito).not.toHaveBeenCalled();
    // identificou e consultou na mesma resposta
    await executarTurno(entrada(['123'], { cliente_id: null, identificado_em: null }), repo, [modelo([{ ferramenta: 'verificar_identidade', entrada: { resposta: '123' } }, { ferramenta: 'consultar_debito', entrada: {} }, { texto: 'Você não tem débitos.' }])]);
    expect(debito).toHaveBeenCalledWith('c1');
  });
  it('conta só uma tentativa de identificação por mensagem do cliente', async () => {
    const { repo } = repoFalso();
    const e = entrada(['999'], { cliente_id: null, identificado_em: null });
    const verificar = { ferramenta: 'verificar_identidade', entrada: { resposta: '999' } };
    await executarTurno(e, repo, [modelo([verificar, verificar, { texto: 'Não conferiu, pode tentar de novo?' }])]);
    expect(e.atendimento.falhas_identificacao).toBe(1);
  });
  it('emergência marca URGENTE e orienta 190 mesmo se a IA falhar', async () => {
    const { repo } = repoFalso();
    const quebrado = new MockLanguageModelV4({ doGenerate: async () => { throw new Error('quota'); } });
    const r = await turnoComRegras(entrada(['tem um ladrão aqui agora']), repo, [quebrado]);
    expect(repo.marcarUrgente).toHaveBeenCalled();
    expect(r.urgente).toBe(true);
    expect(r.texto).toContain('190');
  });
  it('falha da IA vira mensagem humana padrão e transferência', async () => {
    const { repo } = repoFalso();
    const quebrado = new MockLanguageModelV4({ doGenerate: async () => { throw new Error('quota'); } });
    const r = await turnoComRegras(entrada(['minha câmera parou']), repo, [quebrado]);
    expect(r.texto).toMatch(/chamei alguém da equipe/);
    expect(r.transferir).not.toBeNull();
  });
  it('pedido de cancelamento sempre transfere, mesmo se a IA não chamar a ferramenta', async () => {
    const { repo } = repoFalso();
    const r = await turnoComRegras(entrada(['quero cancelar o contrato']), repo, [modelo([{ texto: 'Entendo. Vou te passar para a equipe.' }])]);
    expect(r.transferir?.motivo).toMatch(/cancelamento/);
  });
});
