"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { markMessagesRead, postMessage } from "@/actions/messages";
import { FormError } from "@/components/ui";

/** Zone de saisie + rafraîchissement automatique du fil. */
export function MessageComposer({ canPin, count }: { canPin: boolean; count: number }) {
  const [state, action, pending] = useActionState(postMessage, undefined);
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);

  // Nouveaux messages des collègues toutes les 15 secondes
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(timer);
  }, [router]);

  // À chaque nouveau message affiché : on descend en bas et on marque comme lu
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
    void markMessagesRead();
  }, [count]);

  return (
    <form
      action={action}
      className="card sticky bottom-4 space-y-3 p-4 shadow-sm"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.requestSubmit();
      }}
    >
      <label className="sr-only" htmlFor="body">
        Your message
      </label>
      <textarea
        id="body"
        name="body"
        rows={2}
        className="input"
        placeholder="Write to the team: instructions, missing equipment, job report..."
        maxLength={2000}
        required
      />
      <FormError message={state?.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canPin ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="pinned" className="size-4 accent-ink" />
            Pin as a notice
          </label>
        ) : (
          <span />
        )}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
      <div ref={bottom} />
    </form>
  );
}
