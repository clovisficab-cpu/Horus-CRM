import { describe, it, expect } from 'vitest';
import { cnpjValido, cpfValido, idade, mascaraDocumento, preCadastroSchema } from '@/lib/pre-cadastro';

const base = { codigo: 'ABCDEFGHJK23', tipo: 'PF' as const, nome: 'Maria Souza', documento: '529.982.247-25', data_nascimento: '1990-05-10', email: 'maria@exemplo.com', endereco: 'Rua B, 20, Centro', cidade: 'Baixo Guandu', uf: 'ES' as const, plano: 'Residencial', cameras: 4, periodo_visita: 'manha' as const, aceite_privacidade: true as const, aceite_marketing: false };

describe('pré-cadastro', () => {
  it('valida CPF e CNPJ pelos dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cnpjValido('35.997.228/0001-82')).toBe(true);
    expect(cnpjValido('35.997.228/0001-83')).toBe(false);
  });
  it('calcula a idade e exige maioridade', () => {
    expect(idade('2008-11-11', new Date(2026, 10, 10))).toBe(17);
    expect(idade('2008-11-10', new Date(2026, 10, 10))).toBe(18);
    expect(preCadastroSchema.safeParse({ ...base, data_nascimento: '2012-01-01' }).success).toBe(false);
    expect(preCadastroSchema.safeParse(base).success).toBe(true);
  });
  it('exige o aceite da privacidade; marketing é opcional', () => {
    expect(preCadastroSchema.safeParse({ ...base, aceite_privacidade: false }).success).toBe(false);
    expect(preCadastroSchema.safeParse({ ...base, aceite_marketing: true }).success).toBe(true);
  });
  it('confere o documento conforme o tipo', () => {
    expect(preCadastroSchema.safeParse({ ...base, tipo: 'PJ' }).success).toBe(false);
    expect(preCadastroSchema.safeParse({ ...base, tipo: 'PJ', documento: '35997228000182' }).success).toBe(true);
  });
  it('formata CPF e CNPJ enquanto digita', () => {
    expect(mascaraDocumento('52998224725')).toBe('529.982.247-25');
    expect(mascaraDocumento('35997228000182')).toBe('35.997.228/0001-82');
  });
});
