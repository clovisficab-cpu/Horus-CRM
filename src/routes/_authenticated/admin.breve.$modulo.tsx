import { createFileRoute } from "@tanstack/react-router";
import { Hourglass } from "lucide-react";
import { equipeHead } from "@/lib/page-head";

const NOMES: Record<string, string> = {
  chamados: "Chamados",
  whatsapp: "WhatsApp",
  "ordens-de-servico": "Ordens de serviço",
  financeiro: "Financeiro",
  "base-de-conhecimento": "Base de conhecimento",
};

export const Route = createFileRoute("/_authenticated/admin/breve/$modulo")({ head: ({ params }) => equipeHead(`${NOMES[params.modulo] ?? "Módulo"} — Em breve`, "Módulo previsto para as próximas etapas do Horus."), component: Breve });

function Breve() {
  const { modulo } = Route.useParams();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Hourglass className="h-7 w-7" /></div>
      <h1 className="mt-6 text-3xl font-bold">{NOMES[modulo] ?? "Módulo"}</h1>
      <p className="mt-2 text-muted-foreground">Em breve — este módulo chega nas próximas etapas do Horus.</p>
    </div>
  );
}
