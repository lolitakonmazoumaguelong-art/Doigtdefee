"use client";

import { useState, type ChangeEvent } from "react";
import { saveSettings } from "@/actions/settings";
import { useFormAction } from "@/components/use-form-action";
import { FormError, SubmitButton } from "@/components/ui";
import { CURRENCIES } from "@/lib/format";

type Values = {
  name: string;
  address: string;
  phone: string;
  email: string;
  legalId: string;
  vatNumber: string;
  currency: string;
  taxRate: number;
  footerNote: string;
  accentColor: string;
  logo: string;
};

const COLORS = ["#17201d", "#1d4ed8", "#0f766e", "#b91c1c", "#c2410c", "#6d28d9"];

/** Réduit l'image dans le navigateur pour qu'elle reste légère sur les documents. */
function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 480 / image.width, 240 / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    image.src = url;
  });
}

export function SettingsForm({ values }: { values: Values }) {
  const { state, pending, formProps } = useFormAction(saveSettings);
  const [logo, setLogo] = useState(values.logo);
  const [accent, setAccent] = useState(values.accentColor);
  const [logoError, setLogoError] = useState("");

  const onLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setLogo(await resizeLogo(file));
      setLogoError("");
    } catch {
      setLogoError("Impossible de lire cette image. Essaie un fichier PNG ou JPG.");
    }
  };

  return (
    <form {...formProps} className="max-w-xl space-y-6">
      <input type="hidden" name="logo" value={logo} />
      <input type="hidden" name="accentColor" value={accent} />

      <section className="card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-2xl">Identité sur les documents</h2>
          <p className="mt-1 text-sm text-muted">Ton logo et ta couleur apparaissent sur chaque devis et facture.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-20 w-40 place-items-center rounded-lg border border-dashed border-line bg-paper/50 p-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo de l'entreprise" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted">Pas de logo</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-ghost">
              {logo ? "Changer le logo" : "Ajouter un logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onLogo} />
            </label>
            {logo && (
              <button type="button" className="btn btn-ghost" onClick={() => setLogo("")}>
                Retirer
              </button>
            )}
          </div>
        </div>
        <FormError message={logoError} />
        <fieldset>
          <legend className="label">Couleur des documents</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Couleur ${color}`}
                aria-pressed={accent === color}
                onClick={() => setAccent(color)}
                className={`size-9 cursor-pointer rounded-full border-2 ${accent === color ? "border-ink ring-2 ring-chalk" : "border-card"}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="ml-2 flex items-center gap-2 text-sm text-muted">
              Autre
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-line bg-card"
              />
            </label>
          </div>
        </fieldset>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="font-display text-2xl">Entreprise</h2>
        <div>
          <label className="label" htmlFor="name">
            Nom de l&apos;entreprise
          </label>
          <input id="name" name="name" className="input" defaultValue={values.name} required />
        </div>
        <div>
          <label className="label" htmlFor="address">
            Adresse
          </label>
          <textarea id="address" name="address" rows={2} className="input" defaultValue={values.address} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Téléphone
            </label>
            <input id="phone" name="phone" type="tel" className="input" defaultValue={values.phone} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              E-mail de contact
            </label>
            <input id="email" name="email" type="email" className="input" defaultValue={values.email} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="legalId">
              BRN (numéro d&apos;entreprise)
            </label>
            <input id="legalId" name="legalId" className="input" defaultValue={values.legalId} />
          </div>
          <div>
            <label className="label" htmlFor="vatNumber">
              Numéro de TVA (si assujetti)
            </label>
            <input id="vatNumber" name="vatNumber" className="input" defaultValue={values.vatNumber} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="currency">
              Devise
            </label>
            <select id="currency" name="currency" className="input" defaultValue={values.currency}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="taxRate">
              TVA par défaut (%)
            </label>
            <input id="taxRate" name="taxRate" inputMode="decimal" className="input" defaultValue={String(values.taxRate)} />
            <p className="mt-1.5 text-xs text-muted">Mets 0 si l&apos;entreprise ne facture pas la TVA.</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="footerNote">
            Mentions en bas de document
          </label>
          <textarea
            id="footerNote"
            name="footerNote"
            rows={3}
            className="input"
            placeholder="Conditions de paiement, garantie, coordonnées bancaires, numéro Juice..."
            defaultValue={values.footerNote}
          />
        </div>
      </section>

      <FormError message={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        {state?.ok && (
          <p role="status" className="text-sm text-moss">
            Enregistré.
          </p>
        )}
      </div>
    </form>
  );
}
