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
        <legend className="label">Item type</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "produit", title: "Equipment", text: "Tracked in stock" },
            { id: "service", title: "Service", text: "Installation, package, call-out" },
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
          Description
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder={isService ? "Outdoor camera installation" : "4 MP IP dome camera"}
          defaultValue={product?.name}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Category
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
            Reference
          </label>
          <input id="reference" name="reference" className="input" defaultValue={product?.reference} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="unitPrice">
            Selling price ({currency})
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
            Cost price ({currency})
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
                Quantity in stock
              </label>
              <input id="initialStock" name="initialStock" inputMode="numeric" className="input" defaultValue="0" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="minStock">
              Alert threshold
            </label>
            <input
              id="minStock"
              name="minStock"
              inputMode="numeric"
              className="input"
              defaultValue={product?.minStock ?? 2}
            />
            <p className="mt-1.5 text-xs text-muted">Alert as soon as stock reaches this level.</p>
          </div>
          <div>
            <label className="label" htmlFor="targetStock">
              Ideal stock
            </label>
            <input
              id="targetStock"
              name="targetStock"
              inputMode="numeric"
              className="input"
              defaultValue={product?.targetStock ?? 0}
            />
            <p className="mt-1.5 text-xs text-muted">Level to return to after ordering. 0 = calculated automatically.</p>
          </div>
          <div>
            <label className="label" htmlFor="supplier">
              Supplier
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
        <SubmitButton pending={pending}>{product ? "Save" : "Add item"}</SubmitButton>
        <Link href={product ? `/app/stock/${product.id}` : "/app/stock"} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
