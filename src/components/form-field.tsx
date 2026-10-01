import type { ComponentProps } from "react";

type FieldProps = Omit<ComponentProps<"input">, "name" | "id"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

// Labelled text input on the field-input rule, with an error or hint below.
export function Field({ name, label, hint, error, ...inputProps }: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="field-input"
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-error">
          {error}
        </p>
      )}
      {hintId && (
        <p id={hintId} className="text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// Inline loading indicator for buttons; hidden when reduced motion is preferred.
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border border-current border-r-transparent motion-reduce:hidden"
    />
  );
}
