import { describe, it, expect } from 'vitest';
import { telefoneWhatsApp, pedeHumano } from '@/lib/whatsapp-rules';
import { obterProvedor, normalizarMensagemRecebida, validarAssinaturaMeta } from '@/lib/whatsapp/provider.server';

describe('WhatsApp', () => {
  it('normaliza telefone brasileiro do cadastro', () => expect(telefoneWhatsApp('(11) 99999-0000')).toBe('5511999990000'));
  it('transfere pedidos explícitos, irritação e negociação', () => { for (const text of ['quero um atendente', 'estou irritado', 'quero cancelar', 'quero negociar']) expect(pedeHumano(text)).toBe(true); expect(pedeHumano('câmera offline')).toBe(false); });
  it('preserva id externo para evitar duplicação', () => expect(normalizarMensagemRecebida({ entry: [{ changes: [{ value: { messages: [{ from: '5511999990000', id: 'wamid.1', type: 'text', text: { body: 'Olá' } }] } }] }] })[0]?.idExterno).toBe('wamid.1'));
  it('sem credenciais simula sem id de envio real', async () => { expect(await obterProvedor().enviarMensagem('5511999990000', 'Olá')).toEqual({ status: 'simulada', idExterno: null }); });
  it('rejeita assinatura ausente ou incorreta', async () => { expect(await validarAssinaturaMeta('{}', null, 'teste')).toBe(false); expect(await validarAssinaturaMeta('{}', `sha256=${'0'.repeat(64)}`, 'teste')).toBe(false); });
});
