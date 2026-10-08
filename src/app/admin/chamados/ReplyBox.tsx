"use client";

import { useRef, useState, useTransition } from "react";
import { TICKET_STATUS } from "@/lib/constants";
import { replyAction, suggestReplyAction } from "./actions";

export default function ReplyBox({ ticketId, status, whatsapp }: { ticketId: string; status: string; whatsapp: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [suggesting, startSuggest] = useTransition();
  const [sending, startSend] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startSend(async () => {
          await replyAction(fd);
          setBody("");
          formRef.current?.reset();
        })
      }
      className="card grid gap-3 p-4"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea
        name="body"
        rows={4}
        className="input"
        placeholder="Escreva a resposta ao cliente ou uma nota interna..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="internal" /> Nota interna
          </label>
          <label className="flex items-center gap-2">
            Status:
            <select name="status" defaultValue={status} className="input w-auto py-1">
              {Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {whatsapp && <span className="text-xs text-emerald-700">💬 respostas públicas também vão para o WhatsApp do cliente</span>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-outline"
            disabled={suggesting}
            onClick={() => startSuggest(async () => setBody(await suggestReplyAction(ticketId)))}
          >
            {suggesting ? "Gerando..." : "✨ Sugerir com IA"}
          </button>
          <button className="btn-primary" disabled={sending}>{sending ? "Enviando..." : "Enviar"}</button>
        </div>
      </div>
    </form>
  );
}
