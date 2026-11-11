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
        New password
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={member.id} />
      <label className="sr-only" htmlFor={`pw-${member.id}`}>
        New password for {member.name}
      </label>
      <input
        id={`pw-${member.id}`}
        name="password"
        type="text"
        className="input max-w-56"
        placeholder="New password"
        minLength={8}
        required
      />
      <button className="btn btn-primary" disabled={pending}>
        Confirm
      </button>
      <Saved show={state?.ok} text="Password changed, pass it on to them." />
      <FormError message={state?.error} />
    </form>
  );
}

export function TeamPanel({ members }: { members: Member[] }) {
  const [state, action, pending] = useActionState(addMember, undefined);

  return (
    <section className="card max-w-xl p-5 sm:p-6">
      <h2 className="font-display text-2xl">Team</h2>
      <p className="mt-1 text-sm text-muted">
        Create a login for each employee. They can see stock, clients and documents, but not these settings.
      </p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="mr-auto min-w-0">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-sm text-muted">{member.email}</p>
            </div>
            {member.role === "owner" ? (
              <span className="text-xs text-muted">Owner</span>
            ) : (
              <>
                <ResetPassword member={member} />
                <form action={removeMember}>
                  <input type="hidden" name="id" value={member.id} />
                  <ConfirmButton message={`Remove ${member.name}'s access?`}>Remove</ConfirmButton>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>

      <form action={action} className="mt-5 space-y-3">
        <p className="label">Add an employee</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" className="input" placeholder="Name" aria-label="Employee name" required />
          <input name="email" type="email" className="input" placeholder="Email" aria-label="Employee email" required />
        </div>
        <input
          name="password"
          type="text"
          className="input"
          placeholder="Temporary password (min. 8 characters)"
          aria-label="Temporary password"
          minLength={8}
          required
        />
        <FormError message={state?.error} />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>
            Create login
          </button>
          <Saved show={state?.ok} text="Access created." />
        </div>
      </form>
    </section>
  );
}

export function PasswordPanel() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <section className="card max-w-xl p-5 sm:p-6">
      <h2 className="font-display text-2xl">My password</h2>
      <form action={action} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="current">
              Current
            </label>
            <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
          </div>
          <div>
            <label className="label" htmlFor="next">
              New
            </label>
            <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
        <FormError message={state?.error} />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={pending}>
            Change password
          </button>
          <Saved show={state?.ok} text="Password changed." />
        </div>
      </form>
    </section>
  );
}
