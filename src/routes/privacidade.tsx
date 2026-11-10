import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Horus Videomonitoramento" },
      {
        name: "description",
        content:
          "Política de Privacidade da HORUS MONITORAMENTO LTDA (Horus Videomonitoramento), conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
      },
      { property: "og:title", content: "Política de Privacidade — Horus" },
      { property: "og:description", content: "Como a Horus trata e protege dados pessoais, conforme a LGPD." },
    ],
  }),
  component: Page,
});

const EMAIL = "contato@horusprotecao.com.br";

function Email() {
  return <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

function Secao({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border pt-8">
      <h2 className="mb-3 text-xl font-semibold text-primary">{titulo}</h2>
      {children}
    </section>
  );
}

const BASES: [string, string][] = [
  ["Prestar o serviço de videomonitoramento, instalar e manter equipamentos", "Execução de contrato (art. 7º, V)"],
  ["Enviar alertas de eventos, avisos técnicos e atendimento por WhatsApp", "Execução de contrato (art. 7º, V) e legítimo interesse (art. 7º, IX)"],
  ["Responder pedidos de orçamento e contatos", "Procedimentos preliminares a contrato (art. 7º, V)"],
  ["Cobrança, emissão de notas fiscais e obrigações fiscais", "Execução de contrato e cumprimento de obrigação legal (art. 7º, II e V)"],
  ["Fornecer imagens a autoridades policiais ou judiciais quando requisitado", "Obrigação legal e exercício regular de direitos (art. 7º, II e VI)"],
  ["Segurança do site, prevenção a fraudes e guarda de registros de acesso", "Obrigação legal (Marco Civil) e legítimo interesse (art. 7º, II e IX)"],
  ["Enviar ofertas e novidades pelo WhatsApp ou e-mail", "Consentimento (art. 7º, I), que pode ser retirado a qualquer momento"],
];

function Page() {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl space-y-8 px-5 pt-16 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6">
        <header>
          <div className="eyebrow">LGPD</div>
          <h1 className="mt-3 text-4xl font-bold text-foreground">Política de Privacidade</h1>
          <p className="mt-2 text-sm">Horus Videomonitoramento · Última atualização: 9 de novembro de 2026</p>
        </header>

        <p>
          Esta Política de Privacidade explica como a <strong>HORUS MONITORAMENTO LTDA</strong> (“Horus”, “nós”) coleta, usa,
          compartilha e protege dados pessoais de clientes, interessados e visitantes do site{" "}
          <a href="https://horusprotecao.com.br/">horusprotecao.com.br</a>, inclusive quando a comunicação acontece pelo WhatsApp.
          Ela segue a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD), o Marco Civil da Internet (Lei nº
          12.965/2014) e o Código de Defesa do Consumidor (Lei nº 8.078/1990).
        </p>

        <Secao titulo="1. Quem é o controlador dos dados">
          <div className="mb-3 rounded-lg border border-border bg-card p-5">
            <p className="mb-0">
              <strong>HORUS MONITORAMENTO LTDA</strong> – nome fantasia CAMERITE / Horus Videomonitoramento
              <br />
              CNPJ: 35.997.228/0001-82
              <br />
              Endereço: Avenida Rio Doce, nº 267, Sala 01, Centro, Baixo Guandu – ES, CEP 29730-000
              <br />
              E-mail para assuntos de privacidade: <Email />
            </p>
          </div>
          <p>
            O canal acima é o meio de contato com o encarregado pelo tratamento de dados pessoais, nos termos do art. 41 da LGPD e
            da Resolução CD/ANPD nº 2/2022.
          </p>
        </Secao>

        <Secao titulo="2. Quais dados coletamos">
          <h3>2.1 Dados que você nos fornece</h3>
          <ul>
            <li><strong>Identificação e contato:</strong> nome, CPF ou CNPJ, telefone, WhatsApp, e-mail e endereço do imóvel monitorado.</li>
            <li><strong>Dados contratuais e financeiros:</strong> plano contratado, histórico de pagamentos e dados necessários à cobrança. Dados de cartão são processados diretamente pelas instituições de pagamento e não ficam armazenados por nós.</li>
            <li><strong>Mensagens:</strong> conteúdo das conversas por WhatsApp, e-mail, telefone ou formulário de contato/orçamento.</li>
            <li><strong>Acesso à Área do Cliente:</strong> login e informações de autenticação.</li>
          </ul>
          <h3>2.2 Dados gerados pela prestação do serviço</h3>
          <ul>
            <li><strong>Imagens e eventos de monitoramento:</strong> imagens das câmeras instaladas no local contratado, alertas, registros de eventos e horários. Essas imagens podem conter pessoas que circulam no local.</li>
            <li><strong>Dados técnicos dos equipamentos:</strong> status de conexão das câmeras e registros de funcionamento.</li>
          </ul>
          <h3>2.3 Dados coletados automaticamente no site</h3>
          <ul>
            <li>Endereço IP, data e hora de acesso, tipo de navegador e dispositivo, coletados por nós e por nossos provedores de hospedagem e segurança (por exemplo, Cloudflare). Os registros de acesso são guardados por pelo menos 6 meses, conforme o art. 15 do Marco Civil da Internet.</li>
            <li>Cookies essenciais ao funcionamento do site e da Área do Cliente.</li>
          </ul>
        </Secao>

        <Secao titulo="3. Para que usamos os dados e com qual base legal">
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border bg-card px-3 py-2 text-left text-foreground">Finalidade</th>
                  <th className="border border-border bg-card px-3 py-2 text-left text-foreground">Base legal (LGPD)</th>
                </tr>
              </thead>
              <tbody>
                {BASES.map(([finalidade, base]) => (
                  <tr key={finalidade}>
                    <td className="border border-border px-3 py-2 align-top">{finalidade}</td>
                    <td className="border border-border px-3 py-2 align-top">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Não vendemos dados pessoais e não os usamos para finalidades diferentes das informadas aqui.</p>
        </Secao>

        <Secao titulo="4. Comunicação pelo WhatsApp">
          <p>
            Usamos a Plataforma WhatsApp Business, fornecida pela Meta Platforms, Inc. e pelo WhatsApp LLC, para conversar com
            clientes e interessados. Ao trocar mensagens conosco pelo WhatsApp:
          </p>
          <ul>
            <li>Recebemos seu número de telefone, nome do perfil e o conteúdo das mensagens que você enviar.</li>
            <li>Só enviamos mensagens a quem é nosso cliente, a quem pediu contato ou a quem autorizou expressamente o recebimento.</li>
            <li>Você pode pedir para não receber mais mensagens a qualquer momento, respondendo “SAIR” ou falando com nosso atendimento.</li>
            <li>
              As mensagens são tratadas também pela Meta/WhatsApp, conforme a{" "}
              <Ext href="https://www.whatsapp.com/legal/business-policy/">Política Comercial do WhatsApp</Ext> e a{" "}
              <Ext href="https://www.whatsapp.com/legal/privacy-policy">Política de Privacidade do WhatsApp</Ext>.
            </li>
          </ul>
        </Secao>

        <Secao titulo="5. Com quem compartilhamos os dados">
          <ul>
            <li><strong>Prestadores de serviço (operadores):</strong> plataforma WhatsApp Business (Meta), hospedagem e armazenamento em nuvem, provedores de segurança do site, sistemas de gestão e de cobrança e instituições de pagamento. Eles tratam os dados apenas conforme nossas instruções e para as finalidades desta política.</li>
            <li><strong>Autoridades públicas:</strong> quando houver requisição legal, ordem judicial ou para proteger direitos da Horus, de clientes ou de terceiros.</li>
            <li><strong>Contadores e assessores jurídicos:</strong> quando necessário ao cumprimento de obrigações legais.</li>
          </ul>
        </Secao>

        <Secao titulo="6. Transferência internacional">
          <p>
            Alguns prestadores, como a Meta/WhatsApp e serviços de nuvem, podem armazenar ou processar dados fora do Brasil. Nesses
            casos, a transferência ocorre conforme o art. 33 da LGPD e a Resolução CD/ANPD nº 19/2024, com garantias contratuais
            de proteção compatíveis com a legislação brasileira.
          </p>
        </Secao>

        <Secao titulo="7. Por quanto tempo guardamos os dados">
          <ul>
            <li><strong>Imagens de monitoramento:</strong> pelo período de gravação previsto no plano contratado, sendo apagadas automaticamente depois, salvo se forem necessárias para apuração de incidente, defesa de direitos ou requisição de autoridade.</li>
            <li><strong>Dados cadastrais e contratuais:</strong> durante o contrato e por até 5 anos após o seu fim, para cumprimento de obrigações legais e defesa em processos (Código Civil e Código de Defesa do Consumidor).</li>
            <li><strong>Documentos fiscais:</strong> pelo prazo exigido pela legislação tributária.</li>
            <li><strong>Registros de acesso ao site:</strong> 6 meses, conforme o Marco Civil da Internet.</li>
            <li><strong>Mensagens de WhatsApp:</strong> enquanto forem necessárias ao atendimento e ao histórico do contrato.</li>
          </ul>
          <p>Encerrados esses prazos, os dados são excluídos ou anonimizados.</p>
        </Secao>

        <Secao titulo="8. Segurança">
          <p>
            Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado, perda ou alteração,
            como conexão criptografada (HTTPS), controle de acesso por usuário e senha, acesso restrito às imagens apenas por
            pessoas autorizadas e provedores com padrões reconhecidos de segurança. Em caso de incidente de segurança que possa
            causar risco ou dano relevante, comunicaremos os titulares afetados e a ANPD, conforme o art. 48 da LGPD.
          </p>
        </Secao>

        <Secao titulo="9. Seus direitos">
          <p>Conforme o art. 18 da LGPD, você pode, a qualquer momento e gratuitamente:</p>
          <ul>
            <li>confirmar se tratamos seus dados e acessá-los;</li>
            <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
            <li>pedir a portabilidade dos dados a outro fornecedor;</li>
            <li>pedir a eliminação de dados tratados com base no seu consentimento;</li>
            <li>saber com quem compartilhamos seus dados;</li>
            <li>ser informado sobre a possibilidade de não dar consentimento e suas consequências;</li>
            <li>retirar o consentimento;</li>
            <li>pedir revisão de decisões tomadas apenas com base em tratamento automatizado.</li>
          </ul>
          <p>
            Para exercer esses direitos, escreva para <Email />. Responderemos em até 15 dias. Você também pode apresentar
            reclamação à Autoridade Nacional de Proteção de Dados (ANPD) em <Ext href="https://www.gov.br/anpd">gov.br/anpd</Ext>.
          </p>
        </Secao>

        <Secao id="exclusao-de-dados" titulo="10. Como pedir a exclusão dos seus dados">
          <ol>
            <li>Envie um e-mail para <Email /> com o assunto “Exclusão de dados”, ou mande a mensagem “Quero excluir meus dados” no nosso WhatsApp.</li>
            <li>Informe seu nome e o número de telefone ou e-mail usado no contato com a Horus.</li>
            <li>Podemos pedir uma confirmação de identidade para evitar que outra pessoa faça o pedido em seu nome.</li>
            <li>Excluiremos os dados em até 15 dias e enviaremos a confirmação. Dados que a lei nos obriga a guardar (por exemplo, fiscais ou registros de acesso) serão mantidos apenas pelo prazo legal e depois eliminados.</li>
          </ol>
        </Secao>

        <Secao titulo="11. Crianças e adolescentes">
          <p>
            Nossos serviços são contratados por maiores de 18 anos ou por empresas. Imagens de crianças e adolescentes captadas
            pelas câmeras do local monitorado são tratadas apenas para a finalidade de segurança e no seu melhor interesse,
            conforme o art. 14 da LGPD.
          </p>
        </Secao>

        <Secao titulo="12. Cookies">
          <p>
            O site usa cookies essenciais ao seu funcionamento, à segurança e ao login na Área do Cliente. Você pode bloquear ou
            apagar cookies nas configurações do navegador, mas algumas partes do site podem deixar de funcionar.
          </p>
        </Secao>

        <Secao titulo="13. Alterações desta política">
          <p>
            Podemos atualizar esta política para refletir mudanças nos serviços ou na legislação. A data da última atualização
            fica no topo desta página. Mudanças relevantes serão comunicadas aos clientes pelos canais de contato cadastrados.
          </p>
        </Secao>

        <Secao titulo="14. Legislação e foro">
          <p>
            Esta política é regida pelas leis brasileiras. Fica eleito o foro da comarca do domicílio do titular para resolver
            eventuais controvérsias, conforme o Código de Defesa do Consumidor.
          </p>
        </Secao>
      </article>
    </SiteLayout>
  );
}
