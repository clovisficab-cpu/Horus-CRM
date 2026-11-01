import { Link } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import type { Tables } from "@/integrations/supabase/types";

export function PlanosGrid({ planos }: { planos: Tables<"planos">[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {planos.map((p) => (
        <div
          key={p.id}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-card p-7 shadow-card",
            p.destaque ? "border-primary/60 shadow-gold" : "border-border",
          )}
        >
          {p.destaque && (
            <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold text-primary-foreground">
              <Star className="h-3 w-3" /> Mais escolhido
            </span>
          )}
          <h3 className="text-xl font-semibold">{p.nome}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{p.descricao}</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold">{brl(p.mensalidade)}</span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Até {p.limite_cameras} câmeras · {p.dias_gravacao} dias de gravação
          </div>
          <ul className="mt-6 flex-1 space-y-2.5">
            {p.recursos.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {r}
              </li>
            ))}
          </ul>
          <Button asChild variant={p.destaque ? "hero" : "gold"} className="mt-7">
            <Link to="/contato" search={{ plano: p.nome }}>Quero este plano</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
