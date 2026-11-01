import { useState } from "react";
import { Lock, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Pill, type Tone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { dataHoraBR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Chamado = Tables<"chamados">;
export type Mensagem = Tables<"chamado_mensagens">;

export const CATEGORIAS: Record<string, string> = {
  camera_offline: "Câmera offline",
  qualidade_imagem: "Qualidade de imagem",
  solicitacao_gravacao: "Solicitação de gravação",
  acesso: "Acesso",
  financeiro: "Financeiro",
  instalacao: "Instalação",
  manutencao: "Manutenção",
  outros: "Outros",
};
export const PRIORIDADES: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
export const STATUS_CHAMADO: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};
export const CANAIS: Record<string, string> = { portal: "Portal", telefone: "Telefone", whatsapp: "WhatsApp", interno: "Interno" };

export const toneChamado: Record<string, Tone> = {
  aberto: "gold", em_atendimento: "warning", aguardando_cliente: "muted", resolvido: "success", fechado: "muted",
  baixa: "muted", media: "gold", alta: "warning", urgente: "danger",
};

export const slaEstourado = (c: Pick<Chamado, "prazo_sla" | "status">) =>
  !!c.prazo_sla && !["resolvido", "fechado"].includes(c.status) && new Date(c.prazo_sla) < new Date();

export function Sla({ chamado }: { chamado: Pick<Chamado, "prazo_sla" | "status"> }) {
  const est = slaEstourado(chamado);
  return <span className={cn("text-xs", est ? "font-semibold text-destructive" : "text-muted-foreground")}>{est ? "SLA estourado · " : "Prazo "}{dataHoraBR(chamado.prazo_sla)}</span>;
}

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={toneChamado[status]}>{STATUS_CHAMADO[status] ?? status}</Pill>;
}

export function Conversa({ mensagens, ladoCliente }: { mensagens: Mensagem[]; ladoCliente?: boolean }) {
  if (!mensagens.length) return <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>;
  return (
    <ul className="space-y-3">
      {mensagens.map((m) => {
        if (m.autor === "sistema") return <li key={m.id} className="text-center text-xs text-muted-foreground">{m.texto} · {dataHoraBR(m.created_at)}</li>;
        const meu = ladoCliente ? m.autor === "cliente" : m.autor === "equipe";
        return (
          <li key={m.id} className={cn("flex", meu ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-xl border px-4 py-2 text-sm",
              m.nota_interna ? "border-warning/40 bg-warning/10" : meu ? "border-primary/30 bg-primary/10" : "border-border bg-muted/40")}>
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                {m.nota_interna && <><Lock className="h-3 w-3" /> Nota interna ·</>}
                {m.autor === "cliente" ? "Cliente" : "Equipe Horus"} · {dataHoraBR(m.created_at)}
              </div>
              <p className="whitespace-pre-wrap break-words">{m.texto}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Responder({ onEnviar, permiteNota, onSugerir }: { onEnviar: (texto: string, nota: boolean) => Promise<void>; permiteNota?: boolean; onSugerir?: () => Promise<{ texto: string; erro: string | null }> }) {
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  async function sugerir() {
    if (!onSugerir) return;
    if (texto.trim() && !window.confirm("Substituir o rascunho atual pela sugestão da IA?")) return;
    setSugerindo(true);
    try {
      const resultado = await onSugerir();
      if (resultado.erro) { toast.error(resultado.erro); return; }
      setTexto(resultado.texto); setNota(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível sugerir uma resposta."); }
    finally { setSugerindo(false); }
  }
  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try { await onEnviar(texto.trim(), nota); setTexto(""); } finally { setEnviando(false); }
  }
  return (
    <div className="space-y-2">
      {onSugerir && <Button variant="outline" onClick={sugerir} disabled={sugerindo || enviando}><Sparkles />{sugerindo ? "Preparando rascunho…" : "Sugerir resposta com IA"}</Button>}
      <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={sugerindo} placeholder={nota ? "Nota visível só para a equipe…" : "Escreva sua mensagem…"} maxLength={4000} />
      <div className="flex items-center justify-between gap-3">
        {permiteNota ? (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nota} onChange={(e) => setNota(e.target.checked)} /> Nota interna</label>
        ) : <span />}
        <Button onClick={enviar} disabled={sugerindo || enviando || !texto.trim()}><Send />{nota ? "Salvar nota" : "Enviar"}</Button>
      </div>
    </div>
  );
}
