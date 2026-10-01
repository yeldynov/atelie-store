"use client";

import { type FormEvent, useActionState, useState } from "react";
import { Field, Spinner } from "@/components/form-field";
import { NAME_MAX, validateField } from "@/lib/auth-validation";
import { type NameFormState, updateName } from "./actions";

export function NameForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState(updateName, {} as NameFormState);
  const [name, setName] = useState(currentName);
  // Error found in the browser since the last server response.
  const [clientError, setClientError] = useState<string | null>(null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setClientError(null);
  }

  const changed = name.trim() !== currentName;
  const error = clientError ?? (changed ? state.error : undefined);
  const saved = state.status === "saved" && !changed && !pending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validateField("sign-up", "name", name);
    if (pending || found) {
      event.preventDefault();
      if (found) setClientError(found);
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-6"
    >
      <Field
        name="name"
        label="Name"
        autoComplete="name"
        autoCapitalize="words"
        maxLength={NAME_MAX}
        value={name}
        // Read-only rather than disabled while saving, so focus stays here.
        readOnly={pending}
        error={error}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setName(value);
          if (clientError && !validateField("sign-up", "name", value)) setClientError(null);
        }}
      />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !changed}
        >
          {pending && <Spinner />}
          {pending ? "Saving…" : "Save changes"}
        </button>
        {changed && !pending && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setName(currentName);
              setClientError(null);
            }}
          >
            Cancel
          </button>
        )}
        <p role="status" className="text-muted">
          {saved ? "Your name has been updated." : ""}
        </p>
      </div>
    </form>
  );
}
