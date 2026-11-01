import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Home, Video, ReceiptText, LogOut, Headset } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSair } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/portal")({ component: PortalLayout });

function PortalLayout() {
  const sair = useSair();
  const [saindo, setSaindo] = useState(false);
  async function encerrar() {
    setSaindo(true);
    try { await sair(); }
    catch { toast.error("Não foi possível sair. Tente novamente."); setSaindo(false); }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/portal" aria-label="Horus — início do portal"><Logo /></Link>
          <span className="hidden text-sm text-muted-foreground lg:block">Portal do cliente</span>
          <Button variant="outline" disabled={saindo} onClick={encerrar}><LogOut />{saindo ? "Saindo…" : "Sair"}</Button>
          <nav aria-label="Menu do portal" className="flex w-full flex-wrap gap-1 border-t border-border pt-3 md:w-auto md:border-0 md:pt-0">
            <Button asChild variant="ghost"><Link to="/portal" activeOptions={{ exact: true }} activeProps={{ className: "bg-primary/10 text-primary" }}><Home />Início</Link></Button>
            <Button asChild variant="ghost"><Link to="/portal/cameras" activeProps={{ className: "bg-primary/10 text-primary" }}><Video />Minhas câmeras</Link></Button>
            <Button asChild variant="ghost"><Link to="/portal/financeiro" activeProps={{ className: "bg-primary/10 text-primary" }}><ReceiptText />Financeiro</Link></Button>
            <Button asChild variant="ghost"><Link to="/portal/chamados" activeProps={{ className: "bg-primary/10 text-primary" }}><Headset />Chamados</Link></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10"><Outlet /></main>
    </div>
  );
}
