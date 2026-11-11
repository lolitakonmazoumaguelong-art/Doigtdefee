"use client";

import Link from "next/link";
import { deleteIntervention, saveIntervention } from "@/actions/interventions";
import { useFormAction } from "@/components/use-form-action";
import { ConfirmButton, FormError, SubmitButton } from "@/components/ui";
import { INTERVENTION_STATUSES, INTERVENTION_TYPES } from "@/lib/catalog";

type Values = {
  id?: string;
  clientId: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  technician: string;
  notes: string;
  feedback: string;
  issue: string;
};

export function InterventionForm({
  values,
  clients,
}: {
  values: Values;
  clients: { id: string; name: string; address: string }[];
}) {
  const { state, pending, formProps } = useFormAction(saveIntervention);

  return (
    <div className="card max-w-xl p-5 sm:p-6">
      <form {...formProps} className="space-y-4">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="input"
            placeholder="Install 4 cameras + recorder"
            defaultValue={values.title}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="clientId">
              Client
            </label>
            <select id="clientId" name="clientId" className="input" defaultValue={values.clientId} required>
              <option value="" disabled>
                Choose...
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="type">
              Type
            </label>
            <select id="type" name="type" className="input" defaultValue={values.type}>
              {INTERVENTION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="scheduledDate">
              Date
            </label>
            <input
              id="scheduledDate"
              name="scheduledDate"
              type="date"
              className="input"
              defaultValue={values.scheduledDate}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="scheduledTime">
              Time
            </label>
            <input
              id="scheduledTime"
              name="scheduledTime"
              type="time"
              className="input"
              defaultValue={values.scheduledTime}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="technician">
              Technician
            </label>
            <input id="technician" name="technician" className="input" defaultValue={values.technician} />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" className="input" defaultValue={values.status}>
              {INTERVENTION_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">
            Job address
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            className="input"
            placeholder="Leave empty to use the client's address"
            defaultValue={values.address}
          />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="input"
            placeholder="Equipment to bring, report, points to check..."
            defaultValue={values.notes}
          />
        </div>
        {values.id && (
          <fieldset className="space-y-4 rounded-xl border border-line bg-paper/40 p-4">
            <legend className="px-1 text-sm font-medium">Job report</legend>
            <div>
              <label className="label" htmlFor="feedback">
                Client feedback
              </label>
              <select id="feedback" name="feedback" className="input" defaultValue={values.feedback}>
                <option value="">No feedback yet</option>
                <option value="bon">Satisfied</option>
                <option value="moyen">Mixed</option>
                <option value="mauvais">Unhappy</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="issue">
                Issue encountered
              </label>
              <textarea
                id="issue"
                name="issue"
                rows={2}
                className="input"
                placeholder="Missing equipment, fault, delay, difficult access..."
                defaultValue={values.issue}
              />
            </div>
          </fieldset>
        )}
        <FormError message={state?.error} />
        <div className="flex gap-2">
          <SubmitButton pending={pending}>{values.id ? "Save" : "Schedule"}</SubmitButton>
          <Link href="/app/interventions" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      {values.id && (
        <form action={deleteIntervention} className="mt-6 border-t border-line pt-5">
          <input type="hidden" name="id" value={values.id} />
          <ConfirmButton message="Delete this job?">Delete job</ConfirmButton>
        </form>
      )}
    </div>
  );
}
