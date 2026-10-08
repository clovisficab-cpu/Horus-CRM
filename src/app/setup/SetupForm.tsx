"use client";

import { useActionState } from "react";
import { setupAction } from "./actions";

export default function SetupForm({ needsToken }: { needsToken: boolean }) {
  const [state, action, pending] = useActionState(setupAction, null);
  return (
    <form action={action} className="grid gap-4">
      {needsToken && (
        <label>
          <span className="label">Código de instalação</span>
          <input name="token" required className="input" />
          <span className="mt-1 block text-xs text-slate-500">O mesmo valor da variável SETUP_TOKEN configurada na hospedagem.</span>
        </label>
      )}
      <label><span className="label">Seu nome</span><input name="name" required defaultValue={state?.name} className="input" /></label>
      <label><span className="label">E-mail de acesso</span><input name="email" type="email" required defaultValue={state?.email} className="input" /></label>
      <label><span className="label">Senha (mín. 8 caracteres)</span><input name="password" type="password" required minLength={8} className="input" /></label>
      <label><span className="label">Confirme a senha</span><input name="confirm" type="password" required minLength={8} className="input" /></label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="demo" defaultChecked={state?.demo} className="mt-1" />
        <span>
          Carregar dados de demonstração (clientes, câmeras, chamados, planos e banners de exemplo).
          <span className="block text-xs text-slate-500">
            Também cria os acessos ana@horus.com.br, carlos@horus.com.br e cliente@horus.com.br com a mesma senha acima. Você pode excluí-los depois.
          </span>
        </span>
      </label>
      {state?.error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-gold" disabled={pending}>{pending ? "Configurando..." : "Criar administrador e entrar"}</button>
    </form>
  );
}
