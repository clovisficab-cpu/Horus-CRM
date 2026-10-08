import { submitContact } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Contato" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ enviado?: string; erro?: string; plano?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold text-horus-900">Solicite um orçamento</h1>
        <p className="mt-3 text-slate-500">
          Conte um pouco sobre o local que deseja proteger. Um especialista da Horus entrará em contato para agendar uma visita técnica gratuita.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-slate-600">
          <li>✔ Projeto personalizado</li>
          <li>✔ Visita técnica sem custo</li>
          <li>✔ Instalação rápida com equipe própria</li>
          <li>✔ Suporte 24h via WhatsApp</li>
        </ul>
      </div>
      <div className="card p-6">
        {sp.enviado ? (
          <div className="py-10 text-center">
            <div className="text-4xl">✅</div>
            <h2 className="mt-3 text-xl font-semibold text-horus-900">Recebemos seu contato!</h2>
            <p className="mt-2 text-slate-500">Em breve nossa equipe vai falar com você.</p>
          </div>
        ) : (
          <form action={submitContact} className="grid gap-4">
            {sp.erro && <p className="rounded bg-red-50 p-2 text-sm text-red-700">Informe nome e telefone ou e-mail.</p>}
            <label><span className="label">Nome *</span><input name="name" required className="input" /></label>
            <label><span className="label">Empresa / condomínio</span><input name="company" className="input" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="label">Telefone / WhatsApp</span><input name="phone" className="input" /></label>
              <label><span className="label">E-mail</span><input name="email" type="email" className="input" /></label>
            </div>
            <label>
              <span className="label">Tipo de local</span>
              <select name="interest" className="input" defaultValue="">
                <option value="">Selecione</option>
                <option>Residência</option>
                <option>Condomínio</option>
                <option>Comércio / loja</option>
                <option>Empresa / indústria</option>
              </select>
            </label>
            <label>
              <span className="label">Mensagem</span>
              <textarea name="message" rows={4} className="input" defaultValue={sp.plano ? `Tenho interesse no plano ${sp.plano}.` : ""} />
            </label>
            <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />
            <SubmitButton className="btn-gold" pendingText="Enviando...">Enviar</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
