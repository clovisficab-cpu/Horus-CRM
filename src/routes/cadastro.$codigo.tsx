import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { CheckCircle2, ShieldCheck, Clock, FileCheck2, Lock, AlertTriangle, User, Building2, MapPin, Camera } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { planosQuery } from "@/lib/public-data";
import { obterConviteCadastro, enviarPreCadastro } from "@/lib/pre-cadastro.functions";
import { PERIODOS, UFS, mascaraDocumento, preCadastroSchema } from "@/lib/pre-cadastro";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cadastro/$codigo")({
  head: () => ({
    meta: [
      { title: "Pré-cadastro — Horus Videomonitoramento" },
      { name: "description", content: "Complete seu pré-cadastro na Horus Videomonitoramento." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Campo = "nome" | "documento" | "data_nascimento" | "email" | "endereco" | "cidade" | "uf" | "cameras" | "aceite_privacidade";

function Page() {
  const { codigo } = Route.useParams();
  const obter = useServerFn(obterConviteCadastro);
  const convite = useQuery({ queryKey: ["convite-cadastro", codigo], queryFn: () => obter({ data: { codigo } }), retry: false, staleTime: Infinity });
  const planos = useQuery(planosQuery);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.75_0.135_80/0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14">
          <div className="eyebrow">Pré-cadastro</div>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Falta pouco para <span className="text-gradient-gold">proteger o que importa</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Preencha seus dados uma única vez. Nossa equipe confere tudo e entra em contato para combinar a visita técnica de avaliação, sem compromisso.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          {convite.isLoading ? (
            <p className="py-16 text-center text-muted-foreground">Carregando seu cadastro…</p>
          ) : convite.isError || !convite.data || convite.data.situacao === "invalido" ? (
            <Aviso titulo="Link de cadastro não encontrado" texto="Confira se o link está completo ou peça um novo à Íris pelo WhatsApp da Horus." />
          ) : convite.data.situacao === "usado" ? (
            <Aviso ok titulo="Seu cadastro já foi enviado" texto="Recebemos seus dados. Nossa equipe vai entrar em contato em breve pelo WhatsApp." />
          ) : convite.data.situacao === "expirado" ? (
            <Aviso titulo="Este link expirou" texto="Por segurança, o link vale 7 dias. Peça um novo à Íris pelo WhatsApp da Horus." />
          ) : (
            <Formulario codigo={codigo} nome={convite.data.nome} telefone={convite.data.telefone} interesse={convite.data.interesse} planos={(planos.data ?? []).map((p) => p.nome)} />
          )}
        </div>

        <aside className="space-y-4">
          <Destaque icone={<Clock className="h-5 w-5" />} titulo="Leva cerca de 2 minutos">Com os dados prontos, a equipe já chega preparada para a visita de avaliação.</Destaque>
          <Destaque icone={<FileCheck2 className="h-5 w-5" />} titulo="Sem compromisso">O pré-cadastro não gera contrato nem cobrança. Tudo é combinado com você antes.</Destaque>
          <Destaque icone={<ShieldCheck className="h-5 w-5" />} titulo="Seus dados protegidos">Conexão segura e uso conforme a LGPD e a nossa <Link to="/privacidade" className="text-primary underline underline-offset-2">Política de Privacidade</Link>.</Destaque>
        </aside>
      </section>
    </SiteLayout>
  );
}

function Destaque({ icone, titulo, children }: { icone: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-navy/60 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">{icone}</div>
      <div><p className="font-semibold">{titulo}</p><p className="mt-1 text-sm text-muted-foreground">{children}</p></div>
    </div>
  );
}

function Aviso({ titulo, texto, ok }: { titulo: string; texto: string; ok?: boolean }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      {ok ? <CheckCircle2 className="h-14 w-14 text-success" /> : <AlertTriangle className="h-14 w-14 text-primary" />}
      <h2 className="mt-5 text-2xl font-semibold">{titulo}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{texto}</p>
      <Button asChild variant="gold" className="mt-6"><Link to="/">Conhecer a Horus</Link></Button>
    </div>
  );
}

function Secao({ numero, titulo, icone, children }: { numero: number; titulo: string; icone: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">{numero}</span>
        <span className="flex items-center gap-2 font-display text-lg font-semibold">{icone}{titulo}</span>
      </legend>
      {children}
    </fieldset>
  );
}

function Campo({ id, label, erro, children, className }: { id: string; label: string; erro?: string | undefined; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {erro && <p className="text-xs text-destructive" role="alert">{erro}</p>}
    </div>
  );
}

const selectCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Formulario({ codigo, nome, telefone, interesse, planos }: { codigo: string; nome: string; telefone: string; interesse: string; planos: string[] }) {
  const enviar = useServerFn(enviarPreCadastro);
  const [tipo, setTipo] = useState<"PF" | "PJ">("PF");
  const [f, setF] = useState({ nome, documento: "", data_nascimento: "", email: "", endereco: "", cidade: "", uf: "ES", plano: planos.find((p) => interesse.toLowerCase().includes(p.toLowerCase())) ?? "", cameras: "", periodo_visita: "indiferente" as keyof typeof PERIODOS });
  const [privacidade, setPrivacidade] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: k === "documento" ? mascaraDocumento(e.target.value) : e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral("");
    const dados = { codigo, tipo, ...f, cameras: Number(f.cameras) || 0, aceite_privacidade: privacidade, aceite_marketing: marketing };
    const r = preCadastroSchema.safeParse(dados);
    if (!r.success) {
      const novos: Partial<Record<Campo, string>> = {};
      for (const i of r.error.issues) { const k = i.path[0] as Campo; novos[k] ??= i.message; }
      setErros(novos);
      document.getElementById(Object.keys(novos)[0] ?? "")?.focus();
      return;
    }
    setErros({});
    setEnviando(true);
    try { await enviar({ data: r.data }); setEnviado(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (err) { setErroGeral(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente."); }
    finally { setEnviando(false); }
  }

  if (enviado) return <Aviso ok titulo={`Cadastro recebido, ${f.nome.split(" ")[0]}!`} texto="A equipe Horus vai analisar seus dados e entrar em contato pelo WhatsApp para combinar a visita de avaliação. Você também recebeu a confirmação por lá." />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      {telefone && <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"><Lock className="h-4 w-4 text-primary" />Cadastro vinculado ao WhatsApp <strong className="ml-1">{telefone}</strong></p>}

      <Secao numero={1} titulo="Seus dados" icone={<User className="h-5 w-5 text-primary" />}>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1" role="radiogroup" aria-label="Tipo de cadastro">
          {(["PF", "PJ"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => { setTipo(t); setF({ ...f, documento: "" }); }}
              className={cn("flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-colors", tipo === t ? "bg-gradient-gold text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t === "PF" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}{t === "PF" ? "Pessoa física" : "Empresa / condomínio"}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome" label={tipo === "PF" ? "Nome completo *" : "Razão social *"} erro={erros.nome} className="sm:col-span-2"><Input id="nome" value={f.nome} onChange={set("nome")} autoComplete={tipo === "PF" ? "name" : "organization"} /></Campo>
          <Campo id="documento" label={tipo === "PF" ? "CPF *" : "CNPJ *"} erro={erros.documento}><Input id="documento" inputMode="numeric" value={f.documento} onChange={set("documento")} placeholder={tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} /></Campo>
          <Campo id="data_nascimento" label={tipo === "PF" ? "Data de nascimento *" : "Data de nascimento do responsável *"} erro={erros.data_nascimento}><Input id="data_nascimento" type="date" value={f.data_nascimento} onChange={set("data_nascimento")} autoComplete="bday" max={new Date().toISOString().slice(0, 10)} /></Campo>
          <Campo id="email" label="E-mail *" erro={erros.email} className="sm:col-span-2"><Input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" placeholder="voce@exemplo.com" /></Campo>
        </div>
      </Secao>

      <Secao numero={2} titulo="Imóvel a ser monitorado" icone={<MapPin className="h-5 w-5 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-6">
          <Campo id="endereco" label="Endereço completo *" erro={erros.endereco} className="sm:col-span-6"><Input id="endereco" value={f.endereco} onChange={set("endereco")} autoComplete="street-address" placeholder="Rua, número, complemento e bairro" /></Campo>
          <Campo id="cidade" label="Cidade *" erro={erros.cidade} className="sm:col-span-4"><Input id="cidade" value={f.cidade} onChange={set("cidade")} autoComplete="address-level2" /></Campo>
          <Campo id="uf" label="Estado *" erro={erros.uf} className="sm:col-span-2"><select id="uf" className={selectCls} value={f.uf} onChange={set("uf")}>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Campo>
        </div>
      </Secao>

      <Secao numero={3} titulo="Seu projeto" icone={<Camera className="h-5 w-5 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="plano" label="Plano de interesse"><select id="plano" className={selectCls} value={f.plano} onChange={set("plano")}><option value="">Ainda não sei — quero orientação</option>{planos.map((p) => <option key={p} value={p}>{p}</option>)}</select></Campo>
          <Campo id="cameras" label="Quantas câmeras, aproximadamente? *" erro={erros.cameras}><Input id="cameras" type="number" min={1} max={200} inputMode="numeric" value={f.cameras} onChange={set("cameras")} placeholder="Ex.: 4" /></Campo>
          <Campo id="periodo_visita" label="Melhor período para a visita de avaliação" className="sm:col-span-2">
            <div className="grid gap-2 sm:grid-cols-3">{(Object.entries(PERIODOS) as [keyof typeof PERIODOS, string][]).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setF({ ...f, periodo_visita: k })} className={cn("rounded-md border px-3 py-2.5 text-sm transition-colors", f.periodo_visita === k ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{v}</button>
            ))}</div>
          </Campo>
        </div>
      </Secao>

      <div className="space-y-3 rounded-xl border border-border bg-navy/50 p-5">
        <label htmlFor="aceite_privacidade" className="flex items-start gap-3 text-sm">
          <Checkbox id="aceite_privacidade" checked={privacidade} onCheckedChange={(v) => setPrivacidade(v === true)} className="mt-0.5" />
          <span>Li e aceito a <Link to="/privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</Link> e autorizo o uso dos meus dados para o atendimento e a contratação. *</span>
        </label>
        {erros.aceite_privacidade && <p className="text-xs text-destructive" role="alert">{erros.aceite_privacidade}</p>}
        <label htmlFor="aceite_marketing" className="flex items-start gap-3 text-sm text-muted-foreground">
          <Checkbox id="aceite_marketing" checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5" />
          <span>Quero receber novidades, ofertas e uma mensagem no meu aniversário pelo WhatsApp ou e-mail. (Opcional — você pode cancelar quando quiser.)</span>
        </label>
      </div>

      {erroGeral && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{erroGeral}</p>}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={enviando}>{enviando ? "Enviando…" : "Enviar pré-cadastro"}</Button>
      <p className="text-center text-xs text-muted-foreground">* Campos obrigatórios. O cadastro deve ser feito por maior de 18 anos.</p>
    </form>
  );
}
