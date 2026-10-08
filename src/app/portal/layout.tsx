import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/ui";
import { logoutAction } from "../login/actions";

const NAV = [
  { href: "/portal", label: "Início" },
  { href: "/portal/cameras", label: "Minhas câmeras" },
  { href: "/portal/chamados", label: "Chamados" },
  { href: "/portal/financeiro", label: "Financeiro" },
  { href: "/portal/ajuda", label: "Ajuda" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const customer = await prisma.customer.findUnique({ where: { id: user.customerId } });
  return (
    <div className="min-h-screen">
      <header className="bg-horus-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/portal"><Logo light /></Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 sm:inline">{customer?.name}</span>
            <form action={logoutAction}>
              <button className="text-slate-300 hover:text-gold-400">Sair</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-t-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
