import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/ui";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuração inicial" };

export default async function SetupPage() {
  if ((await prisma.user.count()) > 0) redirect("/login");
  return (
    <div className="flex min-h-screen items-center justify-center bg-horus-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center"><Logo light /></div>
        <div className="card p-6">
          <h1 className="text-lg font-bold text-horus-900">Configuração inicial</h1>
          <p className="mb-5 text-sm text-slate-500">Crie o primeiro administrador do sistema. Esta tela só fica disponível enquanto não houver usuários.</p>
          <SetupForm needsToken={Boolean(process.env.SETUP_TOKEN) || process.env.NODE_ENV === "production"} />
        </div>
      </div>
    </div>
  );
}
