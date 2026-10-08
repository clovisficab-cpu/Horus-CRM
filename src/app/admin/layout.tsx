import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLES, label } from "@/lib/constants";
import { Logo } from "@/components/ui";
import { logoutAction } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [openTickets, waUnread] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["OPEN"] } } }),
    prisma.whatsAppConversation.count({ where: { mode: "HUMAN", unread: { gt: 0 } } }),
  ]);

  const sections: { title: string; items: { href: string; label: string; icon: string; badge?: number; roles?: string[] }[] }[] = [
    {
      title: "Geral",
      items: [{ href: "/admin", label: "Dashboard", icon: "📊" }],
    },
    {
      title: "Atendimento",
      items: [
        { href: "/admin/chamados", label: "Chamados", icon: "🎫", badge: openTickets },
        { href: "/admin/whatsapp", label: "WhatsApp", icon: "💬", badge: waUnread },
        { href: "/admin/ordens", label: "Ordens de serviço", icon: "🛠️" },
        { href: "/admin/conhecimento", label: "Base de conhecimento", icon: "📚", roles: ["ADMIN", "AGENT"] },
      ],
    },
    {
      title: "CRM",
      items: [
        { href: "/admin/clientes", label: "Clientes", icon: "🏢", roles: ["ADMIN", "AGENT"] },
        { href: "/admin/leads", label: "Funil de vendas", icon: "🎯", roles: ["ADMIN", "AGENT"] },
        { href: "/admin/cameras", label: "Câmeras", icon: "🎥" },
        { href: "/admin/financeiro", label: "Financeiro", icon: "💰", roles: ["ADMIN", "AGENT"] },
      ],
    },
    {
      title: "Configurações",
      items: [
        { href: "/admin/planos", label: "Planos", icon: "📦", roles: ["ADMIN"] },
        { href: "/admin/site", label: "Site e banners", icon: "🌐", roles: ["ADMIN"] },
        { href: "/admin/usuarios", label: "Usuários", icon: "👥", roles: ["ADMIN"] },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-horus-950 text-slate-300 lg:flex">
        <div className="border-b border-white/10 px-5 py-4">
          <Link href="/admin"><Logo light /></Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((s) => {
            const items = s.items.filter((i) => !i.roles || i.roles.includes(user.role));
            if (!items.length) return null;
            return (
              <div key={s.title} className="mb-5">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.title}</div>
                {items.map((i) => (
                  <Link key={i.href} href={i.href} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white">
                    <span>{i.icon} {i.label}</span>
                    {!!i.badge && <span className="rounded-full bg-gold-500 px-2 text-xs font-bold text-horus-950">{i.badge}</span>}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-sm">
          <div className="font-semibold text-white">{user.name}</div>
          <div className="text-xs text-slate-500">{label(ROLES, user.role)}</div>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="hover:text-gold-400">Ver site</Link>
            <form action={logoutAction}><button className="hover:text-gold-400">Sair</button></form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* navegação compacta para telas pequenas */}
        <header className="flex items-center gap-3 overflow-x-auto bg-horus-950 px-4 py-3 text-sm text-slate-300 lg:hidden">
          <Logo light />
          {sections.flatMap((s) => s.items).filter((i) => !i.roles || i.roles.includes(user.role)).map((i) => (
            <Link key={i.href} href={i.href} className="whitespace-nowrap hover:text-white">{i.icon} {i.label}</Link>
          ))}
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
