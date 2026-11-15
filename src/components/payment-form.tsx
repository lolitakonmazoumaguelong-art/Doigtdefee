"use client";

import { useActionState } from "react";
import { addPayment } from "@/actions/payments";
import { FormError } from "@/components/ui";
import { PAYMENT_METHODS } from "@/lib/catalog";

export function PaymentForm({ documentId, balance, today }: { documentId: string; balance: number; today: string }) {
  const [state, action, pending] = useActionState(addPayment, undefined);

  return (
    <form action={action} className="space-y-3" key={balance}>
      <input type="hidden" name="documentId" value={documentId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="amount">
            Amount received
          </label>
          <input id="amount" name="amount" inputMode="decimal" className="input" defaultValue={balance / 100} required />
        </div>
        <div>
          <label className="label" htmlFor="paidOn">
            Date
          </label>
          <input id="paidOn" name="paidOn" type="date" className="input" defaultValue={today} max={today} required />
        </div>
        <div>
          <label className="label" htmlFor="method">
            Method
          </label>
          <select id="method" name="method" className="input" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="note">
            Note
          </label>
          <input id="note" name="note" className="input" placeholder="Reference, deposit..." />
        </div>
      </div>
      <FormError message={state?.error} />
      <button className="btn btn-accent" disabled={pending}>
        {pending ? "Saving..." : "Record payment"}
      </button>
    </form>
  );
}
