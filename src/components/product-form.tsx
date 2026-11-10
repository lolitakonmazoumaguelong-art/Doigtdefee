"use client";

import Link from "next/link";
import { useState } from "react";
import { saveProduct } from "@/actions/products";
import { useFormAction } from "@/components/use-form-action";
import { FormError, SubmitButton } from "@/components/ui";
import { CATEGORIES } from "@/lib/catalog";

type ProductValues = {
  id: string;
  name: string;
  reference: string;
  category: string;
  kind: string;
  unitPrice: number;
  costPrice: number;
  minStock: number;
  targetStock: number;
  supplier: string;
};

export function ProductForm({
  product,
  currency,
  suppliers = [],
}: {
  product?: ProductValues;
  currency: string;
  suppliers?: string[];
}) {
  const { state, pending, formProps } = useFormAction(saveProduct);
  const [kind, setKind] = useState(product?.kind ?? "produit");
  const isService = kind === "service";

  return (
    <form {...formProps} className="card max-w-xl space-y-4 p-5 sm:p-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <fieldset>
        <legend className="label">Type d&apos;article</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "produit", title: "Matériel", text: "Géré en stock" },
            { id: "service", title: "Prestation", text: "Pose, forfait, déplacement" },
          ].map((option) => (
            <label
              key={option.id}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
                kind === option.id ? "border-ink bg-chalk/40" : "border-line bg-card hover:bg-paper"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={option.id}
                checked={kind === option.id}
                onChange={() => setKind(option.id)}
                className="sr-only"
              />
              <span className="block font-medium">{option.title}</span>
              <span className="block text-xs text-muted">{option.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="name">
          Désignation
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder={isService ? "Pose d'une caméra extérieure" : "Caméra IP dôme 4 MP"}
          defaultValue={product?.name}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Catégorie
          </label>
          <select
            id="category"
            name="category"
            className="input"
            defaultValue={product?.category ?? "camera"}
            key={isService ? "s" : "p"}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="reference">
            Référence
          </label>
          <input id="reference" name="reference" className="input" defaultValue={product?.reference} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="unitPrice">
            Prix de vente ({currency})
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            inputMode="decimal"
            className="input"
            defaultValue={product ? product.unitPrice / 100 : ""}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="costPrice">
            Prix d&apos;achat ({currency})
          </label>
          <input
            id="costPrice"
            name="costPrice"
            inputMode="decimal"
            className="input"
            defaultValue={product ? product.costPrice / 100 : ""}
          />
        </div>
      </div>
      {!isService && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!product && (
            <div>
              <label className="label" htmlFor="initialStock">
                Quantité en stock
              </label>
              <input id="initialStock" name="initialStock" inputMode="numeric" className="input" defaultValue="0" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="minStock">
              Seuil d&apos;alerte
            </label>
            <input
              id="minStock"
              name="minStock"
              inputMode="numeric"
              className="input"
              defaultValue={product?.minStock ?? 2}
            />
            <p className="mt-1.5 text-xs text-muted">Alerte dès que le stock atteint ce niveau.</p>
          </div>
          <div>
            <label className="label" htmlFor="targetStock">
              Stock idéal
            </label>
            <input
              id="targetStock"
              name="targetStock"
              inputMode="numeric"
              className="input"
              defaultValue={product?.targetStock ?? 0}
            />
            <p className="mt-1.5 text-xs text-muted">Niveau à retrouver après commande. 0 = calcul automatique.</p>
          </div>
          <div>
            <label className="label" htmlFor="supplier">
              Fournisseur
            </label>
            <input
              id="supplier"
              name="supplier"
              list="suppliers"
              className="input"
              defaultValue={product?.supplier}
            />
            <datalist id="suppliers">
              {suppliers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>
      )}
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>{product ? "Enregistrer" : "Ajouter l'article"}</SubmitButton>
        <Link href={product ? `/app/stock/${product.id}` : "/app/stock"} className="btn btn-ghost">
          Annuler
        </Link>
      </div>
    </form>
  );
}
