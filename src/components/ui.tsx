import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-horus-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-horus-900">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "danger" | "warn" | "ok"; href?: string }) {
  const tones = {
    default: "text-horus-900",
    danger: "text-red-600",
    warn: "text-amber-600",
    ok: "text-emerald-600",
  };
  const inner = (
    <div className="card h-full p-5 transition hover:shadow-md">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const BADGE_TONES: Record<string, string> = {
  // genéricos
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  purple: "bg-violet-100 text-violet-700",
  gold: "bg-gold-300/40 text-gold-600",
};

/** Mapeia valores de status para cores */
const STATUS_TONE: Record<string, string> = {
  ACTIVE: "green", ONLINE: "green", PAID: "green", DONE: "green", RESOLVED: "green", WON: "green",
  OPEN: "blue", NEW: "blue", SCHEDULED: "blue", CONTACTED: "blue",
  IN_PROGRESS: "purple", VISIT: "purple", PROPOSAL: "purple", NEGOTIATION: "purple",
  WAITING_CUSTOMER: "yellow", MAINTENANCE: "yellow", SUSPENDED: "yellow", MEDIUM: "yellow",
  OFFLINE: "red", OVERDUE: "red", URGENT: "red", LOST: "red", HIGH: "red",
  CLOSED: "gray", CANCELLED: "gray", INACTIVE: "gray", LOW: "gray",
  BOT: "gold", HUMAN: "purple",
};

export function Badge({ children, tone, value }: { children: ReactNode; tone?: string; value?: string }) {
  const t = tone ?? (value ? STATUS_TONE[value] : undefined) ?? "gray";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[t]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>;
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Select({ name, options, defaultValue, required, includeEmpty }: { name: string; options: Record<string, string> | [string, string][]; defaultValue?: string | null; required?: boolean; includeEmpty?: string }) {
  const entries = Array.isArray(options) ? options : Object.entries(options);
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className="input">
      {includeEmpty !== undefined && <option value="">{includeEmpty}</option>}
      {entries.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 48 32" className="h-7 w-10" aria-hidden>
        <path d="M2 16 C12 2, 36 2, 46 16 C36 30, 12 30, 2 16Z" fill="none" stroke="#d4a537" strokeWidth="3" />
        <circle cx="24" cy="16" r="6" fill="#d4a537" />
        <path d="M18 24 L14 31 M24 22 C26 28, 31 30, 34 27" stroke="#d4a537" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`text-xl font-extrabold tracking-wider ${light ? "text-white" : "text-horus-900"}`}>HORUS</span>
        <span className="text-[10px] font-medium tracking-wide text-gold-500">videomonitoramento</span>
      </span>
    </span>
  );
}
