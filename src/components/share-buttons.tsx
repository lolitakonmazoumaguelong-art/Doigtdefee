"use client";

import { useState } from "react";

/** Envoi du document au client final : lien de consultation, WhatsApp, e-mail. */
export function ShareButtons({
  token,
  label,
  orgName,
  clientPhone,
  clientEmail,
}: {
  token: string;
  label: string;
  orgName: string;
  clientPhone: string;
  clientEmail: string;
}) {
  const [copied, setCopied] = useState(false);
  const link = () => `${window.location.origin}/d/${token}`;
  const message = () => `Bonjour, voici votre ${label} de la part de ${orgName} : ${link()}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie ce lien :", link());
    }
  };
  const whatsapp = () => {
    const phone = clientPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message())}`, "_blank", "noopener");
  };
  const email = () => {
    window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(`${label} - ${orgName}`)}&body=${encodeURIComponent(message())}`;
  };

  return (
    <div className="card mx-auto flex max-w-3xl flex-wrap items-center gap-2 p-4 print:hidden">
      <p className="mr-auto text-sm font-medium">Envoyer au client</p>
      <button type="button" className="btn btn-ghost" onClick={whatsapp}>
        WhatsApp
      </button>
      <button type="button" className="btn btn-ghost" onClick={email}>
        E-mail
      </button>
      <button type="button" className="btn btn-ghost" onClick={copy}>
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
