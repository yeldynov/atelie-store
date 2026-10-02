"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setBag } from "@/lib/bag-client";
import { clearPurchasedItems } from "../actions";

const POLL_MS = 2000;
const MAX_POLLS = 30;

// While the webhook hasn't confirmed payment yet, re-render the page (which
// re-reads the order from the database) every few seconds for about a minute.
export function AwaitConfirmation() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) {
        clearInterval(timer);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [router]);

  if (!timedOut) return null;
  return (
    <p role="status" className="text-muted">
      This is taking longer than usual. You don&apos;t need to pay again: we
      email your receipt as soon as the payment is confirmed.
    </p>
  );
}

// Once the order is paid or settling, take its lines out of the bag.
export function ClearPurchasedItems({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    clearPurchasedItems(sessionId).then((result) => {
      if (result.ok) setBag(result.bag);
    });
  }, [sessionId]);
  return null;
}
