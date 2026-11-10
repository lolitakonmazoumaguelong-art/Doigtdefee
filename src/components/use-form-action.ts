"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import type { FormState } from "@/lib/types";

/**
 * Comme useActionState, mais sans vider le formulaire après une erreur :
 * l'utilisateur garde ce qu'il a saisi et corrige seulement le champ en cause.
 */
export function useFormAction(serverAction: (prev: FormState, formData: FormData) => Promise<FormState>) {
  const [state, dispatch] = useActionState(serverAction, undefined);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };

  return { state, pending, formProps: { action: dispatch, onSubmit } };
}
