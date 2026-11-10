"use client";

import { useActionState, useState } from "react";
import { addMember, changePassword, removeMember, resetMemberPassword } from "@/actions/team";
import { ConfirmButton, FormError } from "@/components/ui";

type Member = { id: string; name: string; email: string; role: string };

function Saved({ show, text }: { show?: boolean; text: string }) {
  return show ? (
    <p role="status" className="text-sm text-moss">
      {text}
    </p>
  ) : null;
}

function ResetPassword({ member }: { member: Member }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resetMemberPassword, undefined);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Nouveau mot de passe
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={member.id} />
      <label className="sr-only" htmlFor={`pw-${member.id}`}>
        Nouveau mot de passe pour {member.name}
      </label>
      <input
        id={`pw-${member.id}`}
        name="password"
        type="text"
        className="input max-w-56"
        placeholder="Nouveau mot de passe"
        minLength={8}
        required
      />
      <button className="btn btn-primary" disabled={pending}>
        Valider
      </button>
      <Saved show={state?.ok} text="Mot de passe changé, transmets-le lui." />
      <FormError message={state?.error} />
    </form>
  );
}

export function TeamPanel({ members }: { members: Member[] }) {
  const [state, action, pending] = useActionState(addMember, undefined);

  return (
    <section className="card max-w-xl p-5 sm:p-6">
      <h2 className="font-display text-2xl">Équipe</h2>
      <p className="mt-1 text-sm text-muted">
        Crée un accès pour chaque employé. Ils voient le stock, les clients et les documents, mais pas ces réglages.
      </p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="mr-auto min-w-0">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-sm text-muted">{member.email}</p>
            </div>
            {member.role === "owner" ? (
              <span className="text-xs text-muted">Responsable</span>
            ) : (
              <>
                <ResetPassword member={member} />
                <form action={removeMember}>
                  <input type="hidden" name="id" value={member.id} />
                  <ConfirmButton message={`Retirer l'accès de ${member.name} ?`}>Retirer</ConfirmButton>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>

      <form action={action} className="mt-5 space-y-3">
        <p className="label">Ajouter un employé</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" className="input" placeholder="Nom" aria-label="Nom de l'employé" required />
          <input name="email" type="email" className="input" placeholder="E-mail" aria-label="E-mail de l'employé" required />
        </div>
        <input
          name="password"
          type="text"
          className="input"
          placeholder="Mot de passe provisoire (8 caractères min.)"
          aria-label="Mot de passe provisoire"
          minLength={8}
          required
        />
        <FormError message={state?.error} />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>
            Créer l&apos;accès
          </button>
          <Saved show={state?.ok} text="Accès créé." />
        </div>
      </form>
    </section>
  );
}

export function PasswordPanel() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <section className="card max-w-xl p-5 sm:p-6">
      <h2 className="font-display text-2xl">Mon mot de passe</h2>
      <form action={action} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="current">
              Actuel
            </label>
            <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
          </div>
          <div>
            <label className="label" htmlFor="next">
              Nouveau
            </label>
            <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
        <FormError message={state?.error} />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>
            Changer le mot de passe
          </button>
          <Saved show={state?.ok} text="Mot de passe changé." />
        </div>
      </form>
    </section>
  );
}
