import { describe, it, expect } from 'vitest';
import { telefoneWhatsApp, pedeHumano, opcaoMenu, soSaudacao, pedeMenu } from '@/lib/whatsapp-rules';
import { obterProvedor, normalizarMensagemRecebida, validarAssinaturaMeta } from '@/lib/whatsapp/provider.server';

describe('WhatsApp', () => {
  it('normaliza telefone brasileiro do cadastro', () => expect(telefoneWhatsApp('(11) 99999-0000')).toBe('5511999990000'));
  it('transfere pedidos explícitos, irritação e negociação', () => { for (const text of ['quero um atendente', 'estou irritado', 'quero cancelar', 'quero negociar']) expect(pedeHumano(text)).toBe(true); expect(pedeHumano('câmera offline')).toBe(false); });
  it('preserva id externo para evitar duplicação', () => expect(normalizarMensagemRecebida({ entry: [{ changes: [{ value: { messages: [{ from: '5511999990000', id: 'wamid.1', type: 'text', text: { body: 'Olá' } }] } }] }] })[0]?.idExterno).toBe('wamid.1'));
  it('sem credenciais simula sem id de envio real', async () => { expect(await obterProvedor().enviarMensagem('5511999990000', 'Olá')).toEqual({ status: 'simulada', idExterno: null }); });
  it('rejeita assinatura ausente ou incorreta', async () => { expect(await validarAssinaturaMeta('{}', null, 'teste')).toBe(false); expect(await validarAssinaturaMeta('{}', `sha256=${'0'.repeat(64)}`, 'teste')).toBe(false); });
  it('reconhece opções numéricas do menu', () => {
    for (const [texto, opcao] of [['3', 3], ['3 ', 3], [' 3.', 3], ['3)', 3], ['opção 3', 3], ['Opcao 3', 3], ['op. 2', 2], ['nº 1', 1], ['3️⃣', 3], ['4', 4], ['4 - ', 4]] as const) expect(opcaoMenu(texto), texto).toBe(opcao);
    for (const texto of ['5', '0', '34', '3 câmeras offline', 'tenho 3 câmeras', 'R$ 3', '']) expect(opcaoMenu(texto), texto).toBeNull();
  });
  it('identifica cumprimentos e pedido de menu sem confundir com pedidos reais', () => {
    for (const texto of ['Olá, teste', 'oi', 'Bom dia!', 'boa tarde, tudo bem?', 'menu']) expect(soSaudacao(texto), texto).toBe(true);
    for (const texto of ['oi, minha câmera está offline', 'quero a 2ª via do boleto', '3']) expect(soSaudacao(texto), texto).toBe(false);
    expect(pedeMenu('Menu')).toBe(true); expect(pedeMenu('menu de planos')).toBe(false);
  });
});
