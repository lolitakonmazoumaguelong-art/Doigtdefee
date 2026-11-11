"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteClient, saveClient } from "@/actions/clients";
import { useFormAction } from "@/components/use-form-action";
import { ConfirmButton, FormError, SubmitButton } from "@/components/ui";

type ClientValues = {
  id: string;
  name: string;
  kind: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export function ClientForm({ client }: { client?: ClientValues }) {
  const { state, pending, formProps } = useFormAction(saveClient);
  const [deleteState, deleteAction] = useActionState(deleteClient, undefined);

  return (
    <div className="card max-w-xl p-5 sm:p-6">
      <form {...formProps} className="space-y-4">
        {client && <input type="hidden" name="id" value={client.id} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <div>
            <label className="label" htmlFor="name">
              Name or company
            </label>
            <input id="name" name="name" className="input" defaultValue={client?.name} required />
          </div>
          <div>
            <label className="label" htmlFor="kind">
              Type
            </label>
            <select id="kind" name="kind" className="input" defaultValue={client?.kind ?? "particulier"}>
              <option value="particulier">Individual</option>
              <option value="entreprise">Company</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" type="tel" className="input" defaultValue={client?.phone} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" defaultValue={client?.email} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">
            Site address
          </label>
          <textarea id="address" name="address" rows={2} className="input" defaultValue={client?.address} />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Internal notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="input"
            placeholder="Equipment already installed, site access, on-site contact..."
            defaultValue={client?.notes}
          />
        </div>
        <FormError message={state?.error} />
        <div className="flex gap-2">
          <SubmitButton pending={pending}>{client ? "Save" : "Add client"}</SubmitButton>
          <Link href={client ? `/app/clients/${client.id}` : "/app/clients"} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      {client && (
        <form action={deleteAction} className="mt-6 space-y-3 border-t border-line pt-5">
          <input type="hidden" name="id" value={client.id} />
          <FormError message={deleteState?.error} />
          <ConfirmButton message={`Delete ${client.name} and their jobs?`}>Delete this client</ConfirmButton>
        </form>
      )}
    </div>
  );
}
