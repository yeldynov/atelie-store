"use server";

import { lineKey, MAX_LINES, MAX_QUANTITY, type Bag, type BagLine } from "@/lib/bag";
import { readBag, resolveCustomerBag, writeBag } from "@/lib/bag-store";
import { getProduct } from "@/lib/product-queries";
import { ONE_SIZE } from "@/lib/products";

// Every action re-reads stock from the database: product pages are cached for
// up to a minute, so the quantities the client saw may be stale. Clients only
// send slug, size and quantity; prices are never taken from the request.
// Successful actions return the resolved bag so the header can update without
// another request.

export type BagActionResult = { ok: true; bag: Bag } | { ok: false; error: string };

async function save(lines: BagLine[]): Promise<BagActionResult> {
  await writeBag(lines);
  return { ok: true, bag: await resolveCustomerBag(lines) };
}

const fail = (error: string): BagActionResult => ({ ok: false, error });

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 200;

const isQuantity = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1;

type StockCheck =
  | { error: string }
  | { available: number; sizeLabel: string };

// Units on hand for the size, or an error if it can't be bought.
async function availableStock(slug: string, size: string): Promise<StockCheck> {
  const product = await getProduct(slug);
  const stock = product?.stock.find((s) => s.size === size);
  if (!product || !stock) {
    return { error: "This item is no longer available." };
  }
  if (stock.quantity <= 0) {
    return {
      error:
        size === ONE_SIZE
          ? `${product.name} is sold out.`
          : `${product.name} is sold out in size ${size}.`,
    };
  }
  return {
    available: stock.quantity,
    // Appended to messages: "Only 2 left in size M."
    sizeLabel: size === ONE_SIZE ? "" : ` in size ${size}`,
  };
}

export async function addToBag(
  slug: unknown,
  size: unknown,
  quantity: unknown = 1,
): Promise<BagActionResult> {
  if (!isText(slug) || !isText(size) || !isQuantity(quantity)) {
    return fail("Please choose a size and quantity.");
  }

  try {
    const stock = await availableStock(slug, size);
    if ("error" in stock) return fail(stock.error);

    const lines = await readBag();
    const key = lineKey(slug, size);
    const existing = lines.find((line) => lineKey(line.slug, line.size) === key);
    const inBag = existing?.quantity ?? 0;

    if (inBag + quantity > stock.available) {
      if (inBag === 0) return fail(`Only ${stock.available} left${stock.sizeLabel}.`);
      if (inBag >= stock.available) {
        return fail(
          `You already have all ${stock.available} available${stock.sizeLabel} in your bag.`,
        );
      }
      return fail(
        `Only ${stock.available} left${stock.sizeLabel}. You have ${inBag} in your bag.`,
      );
    }
    if (inBag + quantity > MAX_QUANTITY) {
      return fail(`You can add up to ${MAX_QUANTITY} of each item.`);
    }

    if (existing) {
      existing.quantity = inBag + quantity;
    } else {
      if (lines.length >= MAX_LINES) {
        return fail("Your bag is full. Remove an item to add another.");
      }
      lines.push({ slug, size, quantity });
    }
    return await save(lines);
  } catch (error) {
    console.error("Add to bag failed", error);
    return fail("Something went wrong on our side. Please try again.");
  }
}

export async function updateQuantity(
  slug: unknown,
  size: unknown,
  quantity: unknown,
): Promise<BagActionResult> {
  if (!isText(slug) || !isText(size) || !isQuantity(quantity)) {
    return fail("Please choose a valid quantity.");
  }

  try {
    const lines = await readBag();
    const key = lineKey(slug, size);
    const existing = lines.find((line) => lineKey(line.slug, line.size) === key);
    if (!existing) return fail("This item is no longer in your bag.");

    const stock = await availableStock(slug, size);
    if ("error" in stock) return fail(stock.error);

    if (quantity > MAX_QUANTITY) {
      return fail(`You can add up to ${MAX_QUANTITY} of each item.`);
    }
    if (quantity > stock.available) {
      return fail(`Only ${stock.available} left${stock.sizeLabel}.`);
    }

    existing.quantity = quantity;
    return await save(lines);
  } catch (error) {
    console.error("Bag quantity update failed", error);
    return fail("Something went wrong on our side. Please try again.");
  }
}

export async function removeFromBag(
  slug: unknown,
  size: unknown,
): Promise<BagActionResult> {
  if (!isText(slug) || !isText(size)) return fail("Item not found.");

  try {
    const key = lineKey(slug, size);
    const lines = await readBag();
    return await save(lines.filter((line) => lineKey(line.slug, line.size) !== key));
  } catch (error) {
    console.error("Bag removal failed", error);
    return fail("Something went wrong on our side. Please try again.");
  }
}

export async function clearBag(): Promise<BagActionResult> {
  return save([]);
}
