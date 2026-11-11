"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { Tone } from "@/lib/format";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-md bg-ink font-display text-lg leading-none text-chalk">
        D
      </span>
      <span className="font-display text-2xl leading-none">Doigt de Fée</span>
    </Link>
  );
}

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel = "One moment...",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
      {message}
    </p>
  );
}

const TONES: Record<Tone, string> = {
  neutral: "bg-ink/8 text-ink/70",
  info: "bg-sky-100 text-sky-900",
  good: "bg-moss/15 text-moss",
  bad: "bg-clay/15 text-clay",
  warn: "bg-amber-100 text-amber-900",
};

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {label}
    </span>
  );
}

export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
      {label}
    </button>
  );
}

export function ConfirmButton({
  children,
  message,
  className = "btn btn-danger",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
