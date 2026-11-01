import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen, Camera, ClipboardList, Gauge, Headset, LayoutTemplate, LogOut, Menu, MessageCircle, Package, UserCog, Users, Wallet, Workflow,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSair } from "@/components/kit";
import { carregarPapeis, isEquipe } from "@/lib/auth";
import { PAPEIS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const papeis = await carregarPapeis(context.user.id);
    if (!isEquipe(papeis)) throw redirect({ to: papeis.includes("cliente") ? "/portal" : "/auth" });
    return { papeis, isAdmin: papeis.includes("admin") };
  },
  head: () => ({ meta: [{ title: "Painel da equipe — Horus" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

type Item = { to: string; label: string; icon: typeof Gauge; admin?: boolean; params?: Record<string, string> };

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Operação",
    itens: [
      { to: "/admin", label: "Dashboard", icon: Gauge },
      { to: "/admin/clientes", label: "Clientes", icon: Users },
      { to: "/admin/funil", label: "Funil de vendas", icon: Workflow },
      { to: "/admin/cameras", label: "Câmeras", icon: Camera },
    ],
  },
  {
    titulo: "Atendimento",
    itens: [
      { to: "/admin/chamados", label: "Chamados", icon: Headset },
      { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { to: "/admin/ordens", label: "Ordens de serviço", icon: ClipboardList },
      { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
      { to: "/admin/conhecimento", label: "Base de conhecimento", icon: BookOpen },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { to: "/admin/planos", label: "Planos", icon: Package, admin: true },
      { to: "/admin/banners", label: "Site e banners", icon: LayoutTemplate, admin: true },
      { to: "/admin/usuarios", label: "Usuários da equipe", icon: UserCog, admin: true },
    ],
  },
];

function AdminLayout() {
  const { isAdmin, papeis, user } = Route.useRouteContext();
  const sair = useSair();
  const [aberto, setAberto] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {GRUPOS.map((g) => {
        const itens = g.itens.filter((i) => !i.admin || isAdmin);
        if (!itens.length) return null;
        return (
          <div key={g.titulo}>
            <div className="px-3 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/50">{g.titulo}</div>
            {itens.map((i) => (
              <Link
                key={i.label}
                to={i.to as "/admin"}
                params={i.params as never}
                onClick={() => setAberto(false)}
                activeOptions={{ exact: i.to === "/admin", includeSearch: false }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-semibold" }}
              >
                <i.icon className="h-4 w-4" /> {i.label}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
        aberto ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="border-b border-sidebar-border px-5 py-4"><Link to="/admin"><Logo /></Link></div>
        {nav}
        <div className="border-t border-sidebar-border p-4">
          <div className="truncate text-sm font-medium">{user.email}</div>
          <div className="text-xs text-primary">{papeis.filter((p) => p !== "cliente").map((p) => PAPEIS[p]).join(", ")}</div>
          <button onClick={sair} className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>
      {aberto && <div className="fixed inset-0 z-40 bg-background/70 lg:hidden" onClick={() => setAberto(false)} />}
      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-5 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setAberto(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <Logo compact />
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
