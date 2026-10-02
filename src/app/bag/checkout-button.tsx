"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/form-field";
import { checkout, type CheckoutState } from "../checkout/actions";

// Posts no bag data: the server action prices the bag from the database,
// reserves stock and redirects to Stripe Checkout.
export function CheckoutButton({
  disabled,
  label = "Checkout",
}: {
  disabled: boolean;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState>(checkout, {});

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-2">
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={disabled || pending}
        aria-describedby={state.error ? "checkout-error" : undefined}
      >
        {pending ? (
          <>
            <Spinner /> Going to secure payment…
          </>
        ) : (
          label
        )}
      </button>
      <p aria-live="polite" className="sr-only">
        {pending ? "Reserving your items and opening the payment page." : ""}
      </p>
      {state.error && !pending && (
        <p id="checkout-error" role="alert" className="text-error">
          {state.error}
        </p>
      )}
      {disabled && (
        <p className="text-center text-muted">
          Remove or update the items marked above to continue.
        </p>
      )}
    </form>
  );
}
