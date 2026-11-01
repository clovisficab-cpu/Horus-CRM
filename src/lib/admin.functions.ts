import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { from: (t: "user_roles") => any }; userId: string };

async function papeisDe(context: Ctx): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

const credenciais = z.object({
  email: z.string().trim().email("E-mail inválido").max(160),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").max(72),
});

/** Cria o primeiro administrador já confirmado. Só funciona enquanto não existir admin. */
export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credenciais.extend({ nome: z.string().trim().max(120).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("O sistema já possui um administrador.");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome ?? "Administrador" },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const criarAcessoPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => credenciais.extend({ clienteId: z.string().uuid(), nome: z.string().trim().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const papeis = await papeisDe(context as unknown as Ctx);
    if (!papeis.some((p) => ["admin", "atendente", "tecnico"].includes(p))) throw new Error("Acesso negado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cli } = await supabaseAdmin.from("clientes").select("nome").eq("id", data.clienteId).single();
    if (!cli) throw new Error("Cliente não encontrado.");
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome || cli.nome },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Falha ao criar usuário.");
    const uid = criado.user.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "cliente" });
    await supabaseAdmin.from("cliente_usuarios").insert({ user_id: uid, cliente_id: data.clienteId });
    await supabaseAdmin.from("atividades").insert({
      cliente_id: data.clienteId,
      tipo: "sistema",
      descricao: `Acesso ao portal criado para ${data.email}`,
      autor: context.userId,
    });
    return { ok: true };
  });

async function exigirAdmin(context: unknown) {
  const papeis = await papeisDe(context as Ctx);
  if (!papeis.includes("admin")) throw new Error("Apenas administradores.");
}

export const listarEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("role", ["admin", "atendente", "tecnico"]);
    const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const porUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => porUser.set(r.user_id, [...(porUser.get(r.user_id) ?? []), r.role]));
    return (lista?.users ?? [])
      .filter((u) => porUser.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        nome: String((u.user_metadata as Record<string, unknown>)?.["nome"] ?? ""),
        papeis: porUser.get(u.id) ?? [],
        ativo: !u.banned_until || new Date(u.banned_until) < new Date(),
        criado: u.created_at,
      }));
  });

export const criarUsuarioEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    credenciais.extend({ nome: z.string().trim().min(2).max(120), papel: z.enum(["admin", "atendente", "tecnico"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Falha ao criar usuário.");
    await supabaseAdmin.from("user_roles").insert({ user_id: criado.user.id, role: data.papel });
    return { ok: true };
  });

export const alterarStatusUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode desativar a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ativo ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lista nomes da equipe para atribuir responsáveis (qualquer membro da equipe). */
export const listarResponsaveis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const papeis = await papeisDe(context as Ctx);
    if (!papeis.some((p) => p === "admin" || p === "atendente" || p === "tecnico")) throw new Error("Apenas equipe.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").in("role", ["admin", "atendente", "tecnico"]);
    const ids = new Set((roles ?? []).map((r) => r.user_id));
    const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return (lista?.users ?? [])
      .filter((u) => ids.has(u.id))
      .map((u) => ({ id: u.id, nome: String((u.user_metadata as Record<string, unknown>)?.["nome"] || u.email || "") }));
  });
