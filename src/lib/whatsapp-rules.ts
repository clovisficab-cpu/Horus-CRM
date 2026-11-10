import { z } from 'zod';

export const mensagemRecebidaSchema = z.object({ telefone: z.string().regex(/^\d{10,15}$/), nome: z.string().max(200), texto: z.string().trim().min(1).max(4000), idExterno: z.string().min(1).max(250) });
export type MensagemRecebida = z.infer<typeof mensagemRecebidaSchema>;
export function telefoneWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}
export function pedeHumano(texto: string) {
  return /\b(humano|atendente|cancelar|cancelamento|negociar|negociação|irritado|absurdo|péssimo)\b/i.test(texto);
}
export const MENU_WHATSAPP = 'Olá! Como podemos ajudar? 1 — Câmeras e acesso; 2 — Gravações; 3 — Financeiro; 4 — Falar com atendente. Responda com o número da opção ou descreva sua necessidade.';

export type OpcaoMenu = 1 | 2 | 3 | 4;

/** Respostas fixas das opções 1–3 do menu (a 4 transfere para a equipe). Não revelam dados privados. */
export const RESPOSTAS_MENU: Record<Exclude<OpcaoMenu, 4>, string> = {
  1: 'Câmeras e acesso: conte em poucas palavras o que está acontecendo (por exemplo: câmera offline, imagem ruim ou sem acesso ao aplicativo) e, se possível, o nome da câmera ou do local.',
  2: 'Gravações: informe a câmera ou o local, a data e o horário aproximado da gravação de que você precisa e o motivo do pedido. Por segurança, imagens só são liberadas depois de confirmarmos a identidade do titular.',
  3: 'Financeiro: a 2ª via e o histórico de faturas ficam na Área do Cliente, em https://horusprotecao.com.br/auth. Se preferir, descreva sua dúvida aqui (por exemplo: 2ª via, pagamento já feito ou mudança de plano) que encaminhamos à equipe.',
};

function normalizar(texto: string) {
  return texto
    .replace(/[\uFE0F\u20E3]/g, '') // emojis numéricos (3️⃣)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();
}

/** Reconhece a escolha de uma opção do menu: "3", "3 ", "3.", "3)", "opção 3", "op 3", "nº 3", "3️⃣". */
export function opcaoMenu(texto: string): OpcaoMenu | null {
  const m = /^(?:(?:opcao|opc|op|numero|n[o\u00ba\u00b0]?)\s*[.:]?\s*)?([1-4])\s*[.)\-:!]*$/.exec(normalizar(texto));
  return m ? (Number(m[1]) as OpcaoMenu) : null;
}

const PALAVRAS_SAUDACAO = new Set(['oi', 'oii', 'oie', 'ola', 'opa', 'eai', 'e', 'ai', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem', 'teste', 'horus', 'hello', 'hi', 'menu', 'inicio']);

/** Mensagem que é só cumprimento (ou "menu"): responde-se com o menu, sem gastar IA. */
export function soSaudacao(texto: string) {
  const palavras = normalizar(texto).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return palavras.length > 0 && palavras.length <= 6 && palavras.every((p) => PALAVRAS_SAUDACAO.has(p));
}

/** Cliente pediu o menu explicitamente. */
export function pedeMenu(texto: string) {
  return /^(menu|opcoes|inicio|voltar)[\s!.?]*$/.test(normalizar(texto));
}