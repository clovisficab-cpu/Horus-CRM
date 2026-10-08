import Link from "next/link";
import { Logo } from "@/components/ui";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/planos", label: "Planos" },
  { href: "/cameras", label: "Câmeras ao vivo" },
  { href: "/contato", label: "Contato" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-horus-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/">
            <Logo light />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-gold-400">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/login" className="btn-gold">
            Área do cliente
          </Link>
        </div>
        <nav className="flex gap-4 overflow-x-auto px-4 pb-2 text-sm text-slate-300 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-gold-400">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-horus-950 text-slate-400">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-3 text-sm">Segurança inteligente com monitoramento por câmeras 24 horas, todos os dias.</p>
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-semibold text-white">Atendimento</h3>
            <p>Suporte 24h pelo WhatsApp com assistente virtual</p>
            <p>Portal do cliente com abertura de chamados</p>
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-semibold text-white">Links</h3>
            <ul className="space-y-1">
              <li><Link href="/planos" className="hover:text-gold-400">Planos</Link></li>
              <li><Link href="/contato" className="hover:text-gold-400">Solicitar orçamento</Link></li>
              <li><Link href="/login" className="hover:text-gold-400">Área do cliente</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Horus Videomonitoramento. Todos os direitos reservados.</div>
      </footer>

      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg hover:bg-emerald-600"
          aria-label="Fale conosco no WhatsApp"
        >
          💬
        </a>
      )}
    </div>
  );
}
