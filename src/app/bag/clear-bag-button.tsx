"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setBag } from "@/lib/bag-client";
import { clearBag } from "./actions";

// Two-step clear: the first click asks, the second empties the bag.
export function ClearBagButton() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  function clear() {
    setError(null);
    startTransition(async () => {
      const result = await clearBag();
      if (result.ok) setBag(result.bag);
      else setError(result.error);
      setConfirming(false);
    });
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="link text-muted"
        >
          Clear bag
        </button>
        {error && <p role="alert" className="text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Confirm clearing the bag"
      className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2"
    >
      <p>Remove all items from your bag?</p>
      <div className="flex gap-2">
        <button
          ref={confirmRef}
          type="button"
          disabled={pending}
          onClick={clear}
          className="btn btn-primary btn-sm"
        >
          {pending ? "Clearing…" : "Clear bag"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
