"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ next }: { next?: string }) {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label>
        <span className="label">E-mail</span>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </label>
      <label>
        <span className="label">Senha</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <button className="btn-gold" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
