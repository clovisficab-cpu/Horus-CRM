import type { User } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { saveStaffAction } from "./actions";

const STAFF_ROLE_OPTIONS = { ADMIN: ROLES.ADMIN, AGENT: ROLES.AGENT, TECH: ROLES.TECH };

function StaffForm({ u }: { u?: User }) {
  return (
    <form action={saveStaffAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {u && <input type="hidden" name="id" value={u.id} />}
      <Field label="Nome"><input name="name" required defaultValue={u?.name} className="input" /></Field>
      <Field label="E-mail"><input name="email" type="email" required defaultValue={u?.email} className="input" /></Field>
      <Field label="Telefone"><input name="phone" defaultValue={u?.phone ?? ""} className="input" /></Field>
      <Field label="Perfil"><Select name="role" options={STAFF_ROLE_OPTIONS} defaultValue={u?.role ?? "AGENT"} /></Field>
      <Field label={u ? "Nova senha (opcional)" : "Senha"}><input name="password" type="password" required={!u} minLength={6} className="input" /></Field>
      <div className="flex items-end justify-between gap-2">
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={u?.active ?? true} /> Ativo</label>
        <SubmitButton>{u ? "Salvar" : "Criar"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams;
  await requireStaff(["ADMIN"]);
  const users = await prisma.user.findMany({ where: { role: { not: "CLIENT" } }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Usuários da equipe" subtitle="Acessos de clientes ao portal são gerenciados na ficha de cada cliente." />
      {sp.erro === "email" && <p className="rounded bg-red-50 p-3 text-sm text-red-700">E-mail já cadastrado.</p>}
      {sp.erro === "senha" && <p className="rounded bg-red-50 p-3 text-sm text-red-700">A senha precisa ter ao menos 6 caracteres.</p>}
      <Card title="Novo usuário"><StaffForm /></Card>
      <Card title="Equipe">
        <div className="space-y-6">
          {users.map((u) => <StaffForm key={u.id} u={u} />)}
        </div>
      </Card>
    </div>
  );
}
