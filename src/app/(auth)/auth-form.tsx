"use client";

import Link from "next/link";
import { Field, Spinner } from "@/components/form-field";
import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthFormState } from "./actions";
import {
  type AuthField,
  type AuthMode,
  EMAIL_MAX,
  type FieldErrors,
  fieldsFor,
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  validateField,
  validateForm,
} from "@/lib/auth-validation";

type Props = {
  mode: AuthMode;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next: string | null;
};

const copy = {
  "sign-in": {
    submit: "Sign in",
    pending: "Signing in…",
    switchPrompt: "New to Atelier?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

// Sign-in / sign-up form. The server action always validates; the same rules
// run here first for instant feedback, and the form still works without JS.
export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const text = copy[mode];

  // Errors found in the browser since the last server response. null means
  // "show what the server returned".
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [password, setPassword] = useState("");
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setClientErrors(null);
    // A failed sign-in clears the password; sign-up keeps it so fixing another
    // field doesn't mean retyping it.
    if (mode === "sign-in" && state.error) setPassword("");
  }

  const errors = clientErrors ?? state.fieldErrors ?? {};
  const formError = clientErrors === null && !pending ? state.error : undefined;

  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [edited, setEdited] = useState<ReadonlySet<AuthField>>(() => new Set());

  function focusField(field: AuthField) {
    const input = formRef.current?.elements.namedItem(field);
    if (input instanceof HTMLInputElement) input.focus();
  }

  // After each server response, move focus to the first problem so keyboard
  // and screen reader users land on it.
  useEffect(() => {
    const first = fieldsFor(mode).find((field) => state.fieldErrors?.[field]);
    if (first) focusField(first);
    else if (state.error) errorRef.current?.focus();
  }, [state, mode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const data = new FormData(event.currentTarget);
    const found = validateForm(mode, {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    const first = fieldsFor(mode).find((field) => found[field]);
    if (first) {
      event.preventDefault();
      setClientErrors(found);
      focusField(first);
    } else {
      // Hide stale errors while the request is in flight.
      setClientErrors({});
    }
  }

  // Check a field once the user leaves it, but only after they've typed in it
  // (or it already shows an error), so tabbing through doesn't flag it.
  function handleBlur(field: AuthField, value: string) {
    if (!edited.has(field) && !errors[field]) return;
    setClientErrors({ ...errors, [field]: validateField(mode, field, value) });
  }

  // Clear a field's error as soon as its value becomes valid.
  function handleChange(field: AuthField, value: string) {
    if (!edited.has(field)) setEdited(new Set(edited).add(field));
    if (errors[field] && !validateField(mode, field, value)) {
      setClientErrors({ ...errors, [field]: undefined });
    }
  }

  function fieldProps(field: AuthField) {
    return {
      error: errors[field],
      onBlur: (event: FormEvent<HTMLInputElement>) =>
        handleBlur(field, event.currentTarget.value),
      onChange: (event: FormEvent<HTMLInputElement>) =>
        handleChange(field, event.currentTarget.value),
    };
  }

  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className="flex flex-col gap-8"
    >
      {next && <input type="hidden" name="next" value={next} />}

      <p
        ref={errorRef}
        tabIndex={-1}
        role="alert"
        className="border-l-2 border-error py-1 pl-3 text-error focus:outline-none empty:hidden"
      >
        {formError}
      </p>

      {/* Disabled while pending; the request's FormData is already captured. */}
      <fieldset disabled={pending} className="flex flex-col gap-6">
        {mode === "sign-up" && (
          <Field
            name="name"
            label="Name"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={NAME_MAX}
            defaultValue={state.values?.name}
            {...fieldProps("name")}
          />
        )}
        <Field
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={EMAIL_MAX}
          defaultValue={state.values?.email}
          {...fieldProps("email")}
        />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          maxLength={PASSWORD_MAX}
          hint={mode === "sign-up" ? `At least ${PASSWORD_MIN} characters.` : undefined}
          value={password}
          {...fieldProps("password")}
          onChange={(event) => {
            setPassword(event.currentTarget.value);
            handleChange("password", event.currentTarget.value);
          }}
        />
      </fieldset>

      <div className="flex flex-col gap-6">
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending && <Spinner />}
          {pending ? text.pending : text.submit}
        </button>

        <p className="text-muted">
          {text.switchPrompt}{" "}
          <Link href={`${text.switchHref}${query}`} className="link text-ink">
            {text.switchLabel}
          </Link>
        </p>
      </div>
    </form>
  );
}
