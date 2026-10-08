import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brl, date, dateTime, ticketCode } from "@/lib/format";
import {
  ACTIVITY_TYPES, CAMERA_STATUS, CONTRACT_STATUS, CUSTOMER_STATUS, INVOICE_STATUS, SERVICE_ORDER_STATUS, SERVICE_ORDER_TYPES, TICKET_STATUS, label,
} from "@/lib/constants";
import { Badge, Card, Empty, Field, PageHeader, Select } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import CustomerForm from "../CustomerForm";
import { addActivityAction, createPortalUserAction, deleteCustomerAction, togglePortalUserAction, updateCustomerAction } from "../actions";
import { createContractAction } from "../../financeiro/actions";

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireStaff(["ADMIN", "AGENT"]);
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      users: true,
      cameras: { orderBy: { name: "asc" } },
      contracts: { include: { plan: true }, orderBy: { startDate: "desc" } },
      invoices: { orderBy: { dueDate: "desc" }, take: 12 },
      tickets: { orderBy: { createdAt: "desc" }, take: 15 },
      serviceOrders: { orderBy: { scheduledAt: "desc" }, take: 10, include: { technician: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 30, include: { user: true } },
    },
  });
  if (!c) notFound();
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { monthlyPrice: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.name}
        subtitle={[c.document, c.city && `${c.city}/${c.state ?? ""}`, c.phone].filter(Boolean).join(" · ")}
        actions={
          <>
            <Badge value={c.status}>{label(CUSTOMER_STATUS, c.status)}</Badge>
            <Link href={`/admin/chamados/novo?customer=${c.id}`} className="btn-outline">Abrir chamado</Link>
            <Link href={`/admin/ordens/nova?customer=${c.id}`} className="btn-outline">Agendar visita</Link>
            <Link href={`/admin/cameras/nova?customer=${c.id}`} className="btn-gold">Adicionar câmera</Link>
          </>
        }
      />

      <details className="card">
        <summary className="cursor-pointer px-5 py-3 font-semibold text-horus-900">✏️ Dados cadastrais</summary>
        <div className="border-t border-slate-100 p-5">
          <CustomerForm action={updateCustomerAction} customer={c} />
          {user.role === "ADMIN" && (
            <form action={deleteCustomerAction} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton message="Excluir o cliente e todos os dados vinculados?">Excluir cliente</ConfirmButton>
            </form>
          )}
        </div>
      </details>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Câmeras (${c.cameras.length})`}>
          {c.cameras.length === 0 ? <Empty>Nenhuma câmera.</Empty> : (
            <table className="table">
              <tbody>
                {c.cameras.map((cam) => (
                  <tr key={cam.id}>
                    <td><Link href={`/admin/cameras/${cam.id}`} className="font-medium hover:text-gold-600">{cam.name}</Link><div className="text-xs text-slate-500">{cam.location}</div></td>
                    <td><Badge value={cam.status}>{label(CAMERA_STATUS, cam.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Contratos">
          {c.contracts.map((ct) => (
            <div key={ct.id} className="mb-3 flex items-center justify-between text-sm">
              <div><strong>{ct.plan.name}</strong> · desde {date(ct.startDate)} · venc. dia {ct.dueDay}</div>
              <div className="flex items-center gap-2">{brl(ct.monthlyValue)} <Badge value={ct.status}>{label(CONTRACT_STATUS, ct.status)}</Badge></div>
            </div>
          ))}
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gold-600">+ Novo contrato</summary>
            <form action={createContractAction} className="mt-3 grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="customerId" value={c.id} />
              <Field label="Plano"><Select name="planId" options={plans.map((p) => [p.id, `${p.name} (${brl(p.monthlyPrice)})`] as [string, string])} required /></Field>
              <Field label="Valor mensal (vazio = do plano)"><input name="monthlyValue" type="number" step="0.01" className="input" /></Field>
              <Field label="Dia de vencimento"><input name="dueDay" type="number" min={1} max={28} defaultValue={10} className="input" /></Field>
              <div className="sm:col-span-3"><SubmitButton>Criar contrato</SubmitButton></div>
            </form>
          </details>
        </Card>

        <Card title="Chamados" actions={<Link href={`/admin/chamados?q=${encodeURIComponent(c.name)}&status=ALL`} className="text-sm text-gold-600">ver todos</Link>}>
          {c.tickets.length === 0 ? <Empty>Nenhum chamado.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {c.tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/chamados/${t.id}`} className="hover:text-gold-600"><span className="font-mono text-xs text-slate-400">{ticketCode(t.number)}</span> {t.subject}</Link>
                  <Badge value={t.status}>{label(TICKET_STATUS, t.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Faturas recentes">
          {c.invoices.length === 0 ? <Empty>Nenhuma fatura.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {c.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2">
                  <span>{i.reference} · venc. {date(i.dueDate)}</span>
                  <span className="flex items-center gap-2">{brl(i.amount)} <Badge value={i.status}>{label(INVOICE_STATUS, i.status)}</Badge></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Ordens de serviço">
          {c.serviceOrders.length === 0 ? <Empty>Nenhuma OS.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {c.serviceOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/ordens/${o.id}`} className="hover:text-gold-600">{label(SERVICE_ORDER_TYPES, o.type)} · {dateTime(o.scheduledAt)} · {o.technician?.name ?? "sem técnico"}</Link>
                  <Badge value={o.status}>{label(SERVICE_ORDER_STATUS, o.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Acesso ao portal do cliente">
          {sp.erro === "senha" && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">Informe e-mail e senha com no mínimo 6 caracteres.</p>}
          {sp.erro === "email" && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">Este e-mail já pertence a outro usuário.</p>}
          {c.users.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100 text-sm">
              {c.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2">
                  <span>{u.name} · {u.email}</span>
                  <form action={togglePortalUserAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <Badge tone={u.active ? "green" : "gray"}>{u.active ? "ativo" : "bloqueado"}</Badge>
                    <button className="text-xs text-slate-500 hover:underline">{u.active ? "bloquear" : "ativar"}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createPortalUserAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="customerId" value={c.id} />
            <input name="name" placeholder="Nome" className="input" />
            <input name="email" type="email" placeholder="E-mail" required defaultValue={c.users.length ? "" : c.email ?? ""} className="input" />
            <input name="password" type="text" placeholder="Senha (mín. 6)" required className="input" />
            <div className="sm:col-span-3"><SubmitButton className="btn-outline">Criar acesso / redefinir senha</SubmitButton></div>
          </form>
        </Card>
      </div>

      <Card title="Linha do tempo">
        <form action={addActivityAction} className="mb-5 flex flex-wrap gap-2">
          <input type="hidden" name="customerId" value={c.id} />
          <div className="w-40"><Select name="type" options={ACTIVITY_TYPES} defaultValue="NOTE" /></div>
          <input name="description" required placeholder="Registrar interação..." className="input flex-1" />
          <SubmitButton>Registrar</SubmitButton>
        </form>
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
          {c.activities.map((a) => (
            <li key={a.id} className="text-sm">
              <div className="text-xs text-slate-500">{dateTime(a.createdAt)} · {label(ACTIVITY_TYPES, a.type)} · {a.user?.name ?? "sistema"}</div>
              <div>{a.description}</div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
