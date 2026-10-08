import Link from "next/link";
import { Logo } from "@/components/ui";
import LoginForm from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-horus-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/"><Logo light /></Link>
        </div>
        <div className="card p-6">
          <h1 className="mb-1 text-lg font-bold text-horus-900">Acessar sua conta</h1>
          <p className="mb-5 text-sm text-slate-500">Clientes e equipe Horus</p>
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Esqueceu a senha? Fale com nosso suporte pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}
