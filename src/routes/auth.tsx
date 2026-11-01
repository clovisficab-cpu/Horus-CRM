import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { carregarPapeis, isEquipe } from "@/lib/auth";
import { criarPrimeiroAdmin } from "@/lib/admin.functions";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Horus Videomonitoramento" },
      { name: "description", content: "Acesse o portal do cliente ou o painel da equipe Horus." },
      { property: "og:title", content: "Entrar — Horus" },
      { property: "og:description", content: "Área do cliente Horus Videomonitoramento." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const setupFn = useServerFn(criarPrimeiroAdmin);
  const [semAdmin, setSemAdmin] = useState(false);
  const [modo, setModo] = useState<"login" | "setup">("login");
  const [loading, setLoading] = useState(false);

  async function irParaArea(userId: string) {
    const papeis = await carregarPapeis(userId);
    if (isEquipe(papeis)) navigate({ to: "/admin", replace: true });
    else if (papeis.includes("cliente")) navigate({ to: "/portal", replace: true });
    else toast.error("Sua conta ainda não tem acesso liberado. Fale com a Horus.");
  }

  useEffect(() => {
    supabase.rpc("sistema_tem_admin").then(({ data }) => setSemAdmin(data === false));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void irParaArea(data.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setLoading(true);
    try {
      if (modo === "setup") {
        await setupFn({ data: { email, password, nome: String(f.get("nome") || "") || undefined } });
        toast.success("Administrador criado!");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("E-mail ou senha inválidos.");
      await irParaArea(data.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <h2 className="max-w-md text-4xl font-bold">O olho que protege o que importa para você.</h2>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/"><Logo /></Link>
          <h1 className="mt-10 text-2xl font-bold">{modo === "setup" ? "Criar conta de administrador" : "Entrar"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === "setup" ? "Primeiro acesso ao sistema Horus." : "Portal do cliente e painel da equipe."}
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {modo === "setup" && (
              <div className="space-y-1.5"><Label htmlFor="nome">Seu nome</Label><Input id="nome" name="nome" /></div>
            )}
            <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" required minLength={6} autoComplete={modo === "setup" ? "new-password" : "current-password"} /></div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>{loading ? "Aguarde..." : modo === "setup" ? "Criar administrador e entrar" : "Entrar"}</Button>
          </form>
          {semAdmin ? (
            <button onClick={() => setModo(modo === "login" ? "setup" : "login")} className="mt-6 text-sm text-primary hover:underline">
              {modo === "login" ? "Primeiro acesso? Criar conta de administrador" : "Já tenho conta"}
            </button>
          ) : (
            <p className="mt-6 text-xs text-muted-foreground">Não tem acesso? Seu login é criado pela equipe Horus.</p>
          )}
        </div>
      </div>
    </div>
  );
}
