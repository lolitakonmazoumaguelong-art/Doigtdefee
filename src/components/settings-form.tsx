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
      reject(new Error("Unreadable image"));
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
      setLogoError("Could not read this image. Try a PNG or JPG file.");
    }
  };

  return (
    <form {...formProps} className="max-w-xl space-y-6">
      <input type="hidden" name="logo" value={logo} />
      <input type="hidden" name="accentColor" value={accent} />

      <section className="card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-2xl">Branding on documents</h2>
          <p className="mt-1 text-sm text-muted">Your logo and colour appear on every quote and invoice.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-20 w-40 place-items-center rounded-lg border border-dashed border-line bg-paper/50 p-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Company logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted">No logo</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-ghost">
              {logo ? "Change logo" : "Add a logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onLogo} />
            </label>
            {logo && (
              <button type="button" className="btn btn-ghost" onClick={() => setLogo("")}>
                Remove
              </button>
            )}
          </div>
        </div>
        <FormError message={logoError} />
        <fieldset>
          <legend className="label">Document colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Colour ${color}`}
                aria-pressed={accent === color}
                onClick={() => setAccent(color)}
                className={`size-9 cursor-pointer rounded-full border-2 ${accent === color ? "border-ink ring-2 ring-chalk" : "border-card"}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="ml-2 flex items-center gap-2 text-sm text-muted">
              Other
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
        <h2 className="font-display text-2xl">Company</h2>
        <div>
          <label className="label" htmlFor="name">
            Company name
          </label>
          <input id="name" name="name" className="input" defaultValue={values.name} required />
        </div>
        <div>
          <label className="label" htmlFor="address">
            Address
          </label>
          <textarea id="address" name="address" rows={2} className="input" defaultValue={values.address} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" type="tel" className="input" defaultValue={values.phone} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Contact email
            </label>
            <input id="email" name="email" type="email" className="input" defaultValue={values.email} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="legalId">
              BRN (business registration no.)
            </label>
            <input id="legalId" name="legalId" className="input" defaultValue={values.legalId} />
          </div>
          <div>
            <label className="label" htmlFor="vatNumber">
              VAT number (if registered)
            </label>
            <input id="vatNumber" name="vatNumber" className="input" defaultValue={values.vatNumber} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="currency">
              Currency
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
              Default VAT (%)
            </label>
            <input id="taxRate" name="taxRate" inputMode="decimal" className="input" defaultValue={String(values.taxRate)} />
            <p className="mt-1.5 text-xs text-muted">Enter 0 if the company does not charge VAT.</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="footerNote">
            Footer notes on documents
          </label>
          <textarea
            id="footerNote"
            name="footerNote"
            rows={3}
            className="input"
            placeholder="Payment terms, warranty, bank details, Juice number..."
            defaultValue={values.footerNote}
          />
        </div>
      </section>

      <FormError message={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>Save</SubmitButton>
        {state?.ok && (
          <p role="status" className="text-sm text-moss">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
