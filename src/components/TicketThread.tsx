import { dateTime } from "@/lib/format";

type Msg = {
  id: string;
  authorType: string;
  body: string;
  internal: boolean;
  createdAt: Date;
  author?: { name: string } | null;
};

const AUTHOR_LABEL: Record<string, string> = {
  CUSTOMER: "Cliente",
  AGENT: "Equipe Horus",
  AI: "Assistente virtual",
  SYSTEM: "Sistema",
};

/** Linha do tempo de mensagens de um chamado. `viewer` define o alinhamento e o que é visível. */
export default function TicketThread({ messages, viewer }: { messages: Msg[]; viewer: "staff" | "customer" }) {
  const visible = viewer === "customer" ? messages.filter((m) => !m.internal) : messages;
  return (
    <ol className="space-y-4">
      {visible.map((m) => {
        const mine = viewer === "customer" ? m.authorType === "CUSTOMER" : m.authorType === "AGENT";
        const tone = m.internal
          ? "bg-amber-50 border-amber-200"
          : m.authorType === "CUSTOMER"
            ? "bg-white border-slate-200"
            : m.authorType === "AI"
              ? "bg-violet-50 border-violet-200"
              : m.authorType === "SYSTEM"
                ? "bg-slate-50 border-slate-200"
                : "bg-horus-900/5 border-horus-900/10";
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl border p-4 ${tone}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <strong className="text-slate-700">{m.author?.name ?? AUTHOR_LABEL[m.authorType] ?? m.authorType}</strong>
                {m.authorType === "AI" && <span>🤖</span>}
                {m.internal && <span className="rounded bg-amber-200 px-1.5 font-semibold text-amber-900">nota interna</span>}
                <span>{dateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
