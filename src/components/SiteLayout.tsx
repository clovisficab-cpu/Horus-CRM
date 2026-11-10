import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock, MessageCircle, Phone, Mail } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/cameras", label: "Câmeras ao vivo" },
  { to: "/planos", label: "Planos" },
  { to: "/contato", label: "Orçamento" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-primary" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Button asChild variant="gold" size="sm">
            <Link to="/auth"><Lock /> Área do cliente</Link>
          </Button>
        </div>
        <nav className="flex gap-5 overflow-x-auto px-5 pb-3 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="whitespace-nowrap text-sm text-muted-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-border bg-navy">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              O olho que protege o que importa para você. Videomonitoramento inteligente para residências, condomínios e empresas.
            </p>
          </div>
          <div>
            <div className="eyebrow mb-4">Navegação</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {NAV.map((n) => (
                <li key={n.to}><Link to={n.to} className="hover:text-foreground">{n.label}</Link></li>
              ))}
              <li><Link to="/auth" className="hover:text-foreground">Área do cliente</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">Contato</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://wa.me/5527997837529" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground"><MessageCircle className="h-4 w-4 text-primary" /> WhatsApp 24h</a></li>
              <li><a href="tel:+5527997837529" className="flex items-center gap-2 hover:text-foreground"><Phone className="h-4 w-4 text-primary" /> (27) 99783-7529</a></li>
              <li><a href="mailto:contato@horusprotecao.com.br" className="flex items-center gap-2 hover:text-foreground"><Mail className="h-4 w-4 text-primary" /> contato@horusprotecao.com.br</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Horus Videomonitoramento. Todos os direitos reservados.
          <span className="mx-2">·</span>
          <Link to="/privacidade" className="hover:text-foreground">Política de Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
