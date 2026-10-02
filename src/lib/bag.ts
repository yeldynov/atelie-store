// Bag types and pure helpers shared by server and client code.
// Cookie I/O and database reads live in ./bag-store.

import type { ProductImage } from "./products";

// Max distinct lines, and max units per line; keeps the cookie small.
export const MAX_LINES = 20;
export const MAX_QUANTITY = 10;

// What the cookie stores: references only, never prices or names.
export type BagLine = {
  slug: string;
  size: string;
  quantity: number;
};

// "unavailable": product, size or stock is gone; excluded from the subtotal.
// "reduced": stock fell below the requested quantity; counted at stock.
export type BagIssue = "unavailable" | "reduced";

export type BagItem = {
  slug: string;
  size: string;
  // False when the product was deleted; there is no page to link to.
  found: boolean;
  name: string;
  image?: ProductImage;
  // In cents, from the current product row.
  unitPrice: number;
  // As stored in the cookie.
  quantity: number;
  // Units on hand for this size right now.
  available: number;
  // Highest quantity the customer can pick for this line.
  maxQuantity: number;
  // Units counted in lineTotal: quantity clamped to stock.
  effectiveQuantity: number;
  lineTotal: number;
  issue?: BagIssue;
};

export type Bag = {
  items: BagItem[];
  // In cents.
  subtotal: number;
  // Units counted in the subtotal.
  count: number;
};

const isQuantity = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 1 &&
  (value as number) <= MAX_QUANTITY;

/** Parses the bag cookie. Drops malformed or duplicate entries; never throws. */
export function parseBagCookie(raw: string | undefined): BagLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const lines: BagLine[] = [];
  for (const entry of data) {
    if (lines.length >= MAX_LINES) break;
    if (typeof entry !== "object" || entry === null) continue;
    const { slug, size, quantity } = entry as Record<string, unknown>;
    if (typeof slug !== "string" || typeof size !== "string") continue;
    if (!isQuantity(quantity)) continue;
    const key = lineKey(slug, size);
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({ slug, size, quantity });
  }
  return lines;
}

export const lineKey = (slug: string, size: string) => `${slug}\u0000${size}`;

export function bagSubtotal(items: BagItem[]) {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}
