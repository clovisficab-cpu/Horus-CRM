import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { ClienteForm } from "@/components/ClienteForm";
import { Empty, PageHeader, Pill, toneStatus } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/clientes/")({ head: () => equipeHead("Clientes", "Cadastros de clientes da Horus Videomonitoramento."), component: Clientes });

function Clientes() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("nome")).data ?? [],
  });
  const q = busca.toLowerCase();
  const lista = data.filter((c) =>
    [c.nome, c.documento, c.email, c.telefone, c.cidade].some((v) => v?.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${data.length} cadastrados`} actions={<Button variant="hero" onClick={() => setNovo(true)}><Plus /> Novo cliente</Button>} />
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, documento, e-mail, cidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : lista.length === 0 ? <Empty>Nenhum cliente encontrado.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3">Contato</th><th className="p-3">Cidade</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((c) => (
                <tr key={c.id} className="hover:bg-card/60">
                  <td className="p-3"><Link to="/admin/clientes/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.nome}</Link><div className="text-xs text-muted-foreground">{c.documento}</div></td>
                  <td className="p-3">{c.tipo}</td>
                  <td className="p-3 text-muted-foreground">{c.whatsapp || c.telefone || c.email || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.cidade ? `${c.cidade}/${c.uf ?? ""}` : "—"}</td>
                  <td className="p-3"><Pill tone={toneStatus[c.status]}>{c.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
          <ClienteForm onSaved={(id) => navigate({ to: "/admin/clientes/$id", params: { id } })} />
        </DialogContent>
      </Dialog>
    </>
  );
}
