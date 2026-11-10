import { z } from 'zod';

// Regras do pré-cadastro (usadas na página e no servidor).

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;
export const PERIODOS = { manha: 'Manhã (8h às 12h)', tarde: 'Tarde (13h às 18h)', indiferente: 'Tanto faz' } as const;

const digitos = (v: string) => v.replace(/\D/g, '');

export function cpfValido(valor: string) {
  const d = digitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(valor: string) {
  const d = digitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n: number) => { const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

/** Idade completa em anos numa data (padrão: hoje). */
export function idade(nascimento: string, hoje = new Date()) {
  const [a, m, d] = nascimento.split('-').map(Number);
  if (!a || !m || !d) return NaN;
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos;
}

export function mascaraDocumento(v: string) {
  const d = digitos(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export const preCadastroSchema = z.object({
  codigo: z.string().regex(/^[A-Za-z0-9]{10,32}$/),
  tipo: z.enum(['PF', 'PJ']),
  nome: z.string().trim().min(3, 'Informe o nome completo').max(120),
  documento: z.string().trim().max(20),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data de nascimento'),
  email: z.string().trim().email('E-mail inválido').max(160),
  endereco: z.string().trim().min(5, 'Informe o endereço do imóvel').max(300),
  cidade: z.string().trim().min(2, 'Informe a cidade').max(120),
  uf: z.enum(UFS, { message: 'Selecione o estado' }),
  plano: z.string().trim().max(120),
  cameras: z.number().int().min(1, 'Informe a quantidade de câmeras').max(200),
  periodo_visita: z.enum(['manha', 'tarde', 'indiferente']),
  aceite_privacidade: z.literal(true, { message: 'É preciso aceitar a Política de Privacidade' }),
  aceite_marketing: z.boolean(),
}).superRefine((d, ctx) => {
  const ok = d.tipo === 'PF' ? cpfValido(d.documento) : cnpjValido(d.documento);
  if (!ok) ctx.addIssue({ code: 'custom', path: ['documento'], message: d.tipo === 'PF' ? 'CPF inválido' : 'CNPJ inválido' });
  const anos = idade(d.data_nascimento);
  if (!(anos >= 18)) ctx.addIssue({ code: 'custom', path: ['data_nascimento'], message: 'O cadastro precisa ser feito por maior de 18 anos' });
  if (anos > 120) ctx.addIssue({ code: 'custom', path: ['data_nascimento'], message: 'Data de nascimento inválida' });
});
export type PreCadastro = z.infer<typeof preCadastroSchema>;
