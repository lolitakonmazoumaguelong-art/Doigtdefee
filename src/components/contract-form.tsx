"use client";

import Link from "next/link";
import { deleteContract, saveContract } from "@/actions/contracts";
import { useFormAction } from "@/components/use-form-action";
import { ConfirmButton, FormError, SubmitButton } from "@/components/ui";

type Values = {
  id?: string;
  clientId: string;
  title: string;
  startDate: string;
  endDate: string;
  nextVisit: string;
  intervalMonths: number;
  price: number;
  notes: string;
  status: string;
};

export function ContractForm({
  values,
  clientName,
  currency,
  canDelete = false,
}: {
  values: Values;
  clientName: string;
  currency: string;
  canDelete?: boolean;
}) {
  const { state, pending, formProps } = useFormAction(saveContract);

  return (
    <div className="card max-w-xl p-5 sm:p-6">
      <form {...formProps} className="space-y-4">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <input type="hidden" name="clientId" value={values.clientId} />
        <p className="text-sm text-muted">Client: {clientName}</p>
        <div>
          <label className="label" htmlFor="title">
            What the contract covers
          </label>
          <input id="title" name="title" className="input" placeholder="CCTV maintenance, 8 cameras + recorder" defaultValue={values.title} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="startDate">
              Start date
            </label>
            <input id="startDate" name="startDate" type="date" className="input" defaultValue={values.startDate} required />
          </div>
          <div>
            <label className="label" htmlFor="endDate">
              End date (optional)
            </label>
            <input id="endDate" name="endDate" type="date" className="input" defaultValue={values.endDate} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="intervalMonths">
              Visit every
            </label>
            <select id="intervalMonths" name="intervalMonths" className="input" defaultValue={String(values.intervalMonths)}>
              {[1, 2, 3, 4, 6, 12, 24].map((m) => (
                <option key={m} value={m}>
                  {m === 1 ? "month" : m === 12 ? "year" : m === 24 ? "2 years" : `${m} months`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nextVisit">
              Next visit
            </label>
            <input id="nextVisit" name="nextVisit" type="date" className="input" defaultValue={values.nextVisit} />
            <p className="mt-1.5 text-xs text-muted">Leave empty to calculate it.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="price">
              Yearly amount ({currency})
            </label>
            <input id="price" name="price" inputMode="decimal" className="input" defaultValue={values.price ? values.price / 100 : ""} />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" className="input" defaultValue={values.status}>
              <option value="actif">Active</option>
              <option value="termine">Ended</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={3} className="input" placeholder="What is included, response time, exclusions..." defaultValue={values.notes} />
        </div>
        <FormError message={state?.error} />
        <div className="flex gap-2">
          <SubmitButton pending={pending}>{values.id ? "Save" : "Create contract"}</SubmitButton>
          <Link href={`/app/clients/${values.clientId}`} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
      {values.id && canDelete && (
        <form action={deleteContract} className="mt-6 border-t border-line pt-5">
          <input type="hidden" name="id" value={values.id} />
          <input type="hidden" name="clientId" value={values.clientId} />
          <ConfirmButton message="Delete this maintenance contract?">Delete contract</ConfirmButton>
        </form>
      )}
    </div>
  );
}
