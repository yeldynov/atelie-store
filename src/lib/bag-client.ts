"use client";

import { useSyncExternalStore } from "react";
import type { Bag } from "./bag";

// Browser-side copy of the bag for the header count and mini bag. Loaded from
// /api/bag, then replaced with the bag each successful bag action returns.

let current: Bag | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function setBag(bag: Bag) {
  current = bag;
  listeners.forEach((listener) => listener());
}

/** Fetches the bag; concurrent calls share one request. */
export function loadBag() {
  loading ??= fetch("/api/bag", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((bag: Bag | null) => {
      if (bag) setBag(bag);
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The bag, or null until the first load finishes. */
export function useBag() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
