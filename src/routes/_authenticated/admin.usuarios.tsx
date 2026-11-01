import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Empty, errMsg, Field, PageHeader, Pill, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { alterarStatusUsuario, criarUsuarioEquipe, listarEquipe } from "@/lib/admin.functions";
import { PAPEIS } from "@/lib/format";
import { equipeHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({ head: () => equipeHead("Usuários da equipe", "Área de contas da equipe Horus Videomonitoramento."), component: P });

function P() {
  const { isAdmin, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const listar = useServerFn(listarEquipe);
  const criar = useServerFn(criarUsuarioEquipe);
  const alterar = useServerFn(alterarStatusUsuario);
  const [novo, setNovo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ nome: "", email: "", password: "", papel: "atendente" as "admin" | "atendente" | "tecnico" });
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "equipe"], queryFn: () => listar(), enabled: isAdmin });
  if (!isAdmin) return <Empty>Apenas administradores.</Empty>;
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin", "equipe"] });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar({ data: f });
      toast.success("Usuário criado");
      setNovo(false);
      setF({ nome: "", email: "", password: "", papel: "atendente" });
      recarregar();
    } catch (err) { toast.error(errMsg(err)); } finally { setLoading(false); }
  }

  async function toggle(id: string, ativo: boolean) {
    try { await alterar({ data: { userId: id, ativo } }); recarregar(); } catch (err) { toast.error(errMsg(err)); }
  }

  return (
    <>
      <PageHeader title="Usuários da equipe" actions={<Button variant="hero" onClick={() => setNovo(true)}><Plus /> Novo usuário</Button>} />
      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : data.length === 0 ? <Empty>Nenhum usuário.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">Papel</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((u) => (
                <tr key={u.id}>
                  <td className="p-3"><div className="font-medium">{u.nome || "—"}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                  <td className="p-3">{u.papeis.map((p) => PAPEIS[p] ?? p).join(", ")}</td>
                  <td className="p-3">{u.ativo ? <Pill tone="success">Ativo</Pill> : <Pill>Inativo</Pill>}</td>
                  <td className="p-3 text-right">
                    {u.id !== user.id && <Button size="sm" variant="outline" onClick={() => toggle(u.id, !u.ativo)}>{u.ativo ? "Desativar" : "Ativar"}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário da equipe</DialogTitle></DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <Field label="Nome"><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required minLength={2} /></Field>
            <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
            <Field label="Senha"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} /></Field>
            <Field label="Papel">
              <select className={selectCls} value={f.papel} onChange={(e) => setF({ ...f, papel: e.target.value as typeof f.papel })}>
                <option value="admin">Administrador</option><option value="atendente">Atendente</option><option value="tecnico">Técnico</option>
              </select>
            </Field>
            <div className="flex justify-end"><Button type="submit" variant="hero" disabled={loading}>{loading ? "Criando..." : "Criar usuário"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
