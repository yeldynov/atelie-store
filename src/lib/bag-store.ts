import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import {
  MAX_QUANTITY,
  bagSubtotal,
  parseBagCookie,
  type Bag,
  type BagItem,
  type BagLine,
} from "./bag";
import { getProductsBySlugs } from "./product-queries";

// The bag is a cookie of { slug, size, quantity } references. Prices and stock
// always come from the database, so the cookie is untrusted input only.

const COOKIE = "bag";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function readBag(): Promise<BagLine[]> {
  return parseBagCookie((await cookies()).get(COOKIE)?.value);
}

/** Only callable from server actions and route handlers. */
export async function writeBag(lines: BagLine[]) {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** The bag in the request cookie, resolved. Deduplicated per request. */
export const getBag = cache(async () => resolveBag(await readBag()));

/** Resolves bag lines against current prices and stock. */
export async function resolveBag(lines: BagLine[]): Promise<Bag> {
  const products = await getProductsBySlugs([
    ...new Set(lines.map((line) => line.slug)),
  ]);
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const items = lines.map((line): BagItem => {
    const product = bySlug.get(line.slug);
    const available =
      product?.stock.find((s) => s.size === line.size)?.quantity ?? 0;
    const effectiveQuantity = Math.min(line.quantity, available);
    const unitPrice = product?.price ?? 0;
    return {
      slug: line.slug,
      size: line.size,
      found: product !== undefined,
      name: product?.name ?? "Item no longer available",
      image: product?.images[0],
      unitPrice,
      quantity: line.quantity,
      available,
      maxQuantity: Math.min(available, MAX_QUANTITY),
      effectiveQuantity,
      lineTotal: unitPrice * effectiveQuantity,
      issue:
        effectiveQuantity === 0
          ? "unavailable"
          : effectiveQuantity < line.quantity
            ? "reduced"
            : undefined,
    };
  });

  return {
    items,
    subtotal: bagSubtotal(items),
    count: items.reduce((sum, item) => sum + item.effectiveQuantity, 0),
  };
}
