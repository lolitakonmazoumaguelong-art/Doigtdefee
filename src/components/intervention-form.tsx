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
            Intitulé
          </label>
          <input
            id="title"
            name="title"
            className="input"
            placeholder="Pose de 4 caméras + enregistreur"
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
                Choisir...
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
              Heure
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
              Technicien
            </label>
            <input id="technician" name="technician" className="input" defaultValue={values.technician} />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Statut
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
            Adresse d&apos;intervention
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            className="input"
            placeholder="Laisse vide pour utiliser l'adresse du client"
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
            placeholder="Matériel à emporter, compte rendu, points à vérifier..."
            defaultValue={values.notes}
          />
        </div>
        {values.id && (
          <fieldset className="space-y-4 rounded-xl border border-line bg-paper/40 p-4">
            <legend className="px-1 text-sm font-medium">Bilan de l&apos;intervention</legend>
            <div>
              <label className="label" htmlFor="feedback">
                Avis du client
              </label>
              <select id="feedback" name="feedback" className="input" defaultValue={values.feedback}>
                <option value="">Pas encore d&apos;avis</option>
                <option value="bon">Satisfait</option>
                <option value="moyen">Mitigé</option>
                <option value="mauvais">Mécontent</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="issue">
                Difficulté rencontrée
              </label>
              <textarea
                id="issue"
                name="issue"
                rows={2}
                className="input"
                placeholder="Matériel manquant, panne, retard, accès compliqué..."
                defaultValue={values.issue}
              />
            </div>
          </fieldset>
        )}
        <FormError message={state?.error} />
        <div className="flex gap-2">
          <SubmitButton pending={pending}>{values.id ? "Enregistrer" : "Planifier"}</SubmitButton>
          <Link href="/app/interventions" className="btn btn-ghost">
            Annuler
          </Link>
        </div>
      </form>

      {values.id && (
        <form action={deleteIntervention} className="mt-6 border-t border-line pt-5">
          <input type="hidden" name="id" value={values.id} />
          <ConfirmButton message="Supprimer cette intervention ?">Supprimer l&apos;intervention</ConfirmButton>
        </form>
      )}
    </div>
  );
}
