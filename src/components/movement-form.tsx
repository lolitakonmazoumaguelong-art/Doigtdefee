"use client";

import { useActionState } from "react";
import { moveStock, setCountedStock } from "@/actions/products";
import { FormError } from "@/components/ui";

export function MovementForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(moveStock, undefined);

  return (
    <form action={action} className="card space-y-4 p-5">
      <p className="label">Stock movement</p>
      <input type="hidden" name="productId" value={productId} />
      <div className="grid grid-cols-[6rem_1fr] gap-3">
        <div>
          <label className="sr-only" htmlFor="quantity">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            inputMode="numeric"
            className="input"
            placeholder="Qty"
            required
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="note">
            Motif
          </label>
          <input id="note" name="note" className="input" placeholder="Reason (supplier delivery, breakage...)" />
        </div>
      </div>
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <button name="direction" value="entree" disabled={pending} className="btn btn-primary flex-1">
          + Stock in
        </button>
        <button name="direction" value="sortie" disabled={pending} className="btn btn-ghost flex-1">
          − Stock out
        </button>
      </div>
      <button name="direction" value="defaut" disabled={pending} className="btn btn-danger w-full">
        Faulty / returned
      </button>
    </form>
  );
}

/** Inventaire : on saisit ce qu'on a réellement compté sur l'étagère. */
export function InventoryForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(setCountedStock, undefined);

  return (
    <form action={action} className="card space-y-3 p-5">
      <label className="label" htmlFor="counted">
        Stock count: quantity counted
      </label>
      <input type="hidden" name="productId" value={productId} />
      <div className="flex gap-2">
        <input id="counted" name="counted" inputMode="numeric" className="input" placeholder="e.g. 7" required />
        <button className="btn btn-ghost" disabled={pending}>
          Correct
        </button>
      </div>
      <FormError message={state?.error} />
      {state?.ok && (
        <p role="status" className="text-sm text-moss">
          Stock updated.
        </p>
      )}
    </form>
  );
}
