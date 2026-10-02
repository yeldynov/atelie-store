"use client";

import { useState } from "react";
import { Spinner } from "@/components/form-field";

// Two-step submit for destructive actions, inside the action's own form: the
// first click asks, the second submits. No browser dialog.
export function ConfirmButton({
  label,
  confirmLabel,
  pendingLabel,
  pending,
  disabled = false,
  className = "link text-muted disabled:no-underline disabled:opacity-40",
}: {
  label: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking && !pending) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAsking(true)}
        className={className}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending && <Spinner />}
        {pending ? pendingLabel : confirmLabel}
      </button>
      {!pending && (
        <button type="button" onClick={() => setAsking(false)} className="link text-muted">
          Cancel
        </button>
      )}
    </span>
  );
}
