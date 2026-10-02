"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { db } from "@/db";
import { orderItems, orders, productStock } from "@/db/schema";
import { parseQuantity, PRODUCT_LIMITS, validateSizes } from "@/lib/admin-validation";
import { pgErrorCode } from "@/lib/orders";
import { assertAdmin } from "@/lib/session";

// Every action checks the admin role first: server actions can be called
// directly, so the admin pages' own checks don't protect them.

export type StockFormState = {
  status?: "saved";
  error?: string;
};

const UNEXPECTED_ERROR = "Something went wrong on our side. Please try again.";

const positiveInt = (value: FormDataEntryValue | null) => {
  const number = Number(value);
  return typeof value === "string" && Number.isInteger(number) && number > 0
    ? number
    : undefined;
};

/**
 * Sets units on hand for one size. Checkout reserves stock by decrementing the
 * same column, so the write only applies if the quantity is still the one the
 * admin saw; otherwise nothing changes and the page reloads the current value.
 */
export async function updateStock(
  _prev: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await assertAdmin();

  const stockId = positiveInt(formData.get("stockId"));
  const productId = positiveInt(formData.get("productId"));
  const expected = parseQuantity(String(formData.get("expected") ?? ""));
  if (!stockId || !productId || expected === undefined) return { error: "Unknown size." };

  const quantity = parseQuantity(String(formData.get("quantity") ?? ""));
  if (quantity === undefined) {
    return { error: `Enter a whole number from 0 to ${PRODUCT_LIMITS.quantity.toLocaleString("en-US")}.` };
  }

  try {
    const updated = await db
      .update(productStock)
      .set({ quantity })
      .where(
        and(
          eq(productStock.id, stockId),
          eq(productStock.productId, productId),
          eq(productStock.quantity, expected),
        ),
      )
      .returning({ id: productStock.id });

    if (updated.length === 0) {
      const current = await db.query.productStock.findFirst({
        where: and(eq(productStock.id, stockId), eq(productStock.productId, productId)),
        columns: { quantity: true },
      });
      refresh();
      return {
        error: current
          ? `Stock changed to ${current.quantity} since you opened this page, from a checkout or another admin. Review it and save again.`
          : "This size no longer exists.",
      };
    }
  } catch (error) {
    console.error("Stock update failed", error);
    return { error: UNEXPECTED_ERROR };
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
}

/** Adds a size with no stock, after the product's existing sizes. */
export async function addSize(
  productId: number,
  _prev: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await assertAdmin();
  if (!Number.isInteger(productId) || productId <= 0) return { error: "Unknown product." };

  const raw = formData.get("size");
  const size = typeof raw === "string" ? raw.trim() : "";
  if (!size) return { error: "Enter a size." };

  try {
    const existing = await db
      .select({ size: productStock.size })
      .from(productStock)
      .where(eq(productStock.productId, productId));
    const sizeError = validateSizes([...existing.map((row) => row.size), size]);
    if (sizeError) return { error: sizeError };

    await db.insert(productStock).values({
      productId,
      size,
      quantity: 0,
      position: sql`(select coalesce(max(${productStock.position}), -1) + 1 from ${productStock} where ${productStock.productId} = ${productId})`,
    });
  } catch (error) {
    const code = pgErrorCode(error);
    if (code === "23505") return { error: "This product already has that size." };
    if (code === "23503") return { error: "This product no longer exists." };
    console.error("Adding a size failed", error);
    return { error: UNEXPECTED_ERROR };
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
}

/**
 * Removes a size. Refused while open checkouts hold units of it (cancelling
 * them returns units to this row), for the product's last size, and when the
 * quantity changed since the page loaded. All checked in the DELETE itself; a
 * checkout reserving this size at the same moment changes the quantity, so the
 * guard on `expected` stops the delete.
 */
export async function removeSize(
  _prev: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await assertAdmin();

  const stockId = positiveInt(formData.get("stockId"));
  const productId = positiveInt(formData.get("productId"));
  const expected = parseQuantity(String(formData.get("expected") ?? ""));
  if (!stockId || !productId || expected === undefined) return { error: "Unknown size." };

  try {
    const { rows } = await db.execute<{ id: number }>(sql`
      delete from ${productStock} s
      where s.id = ${stockId}
        and s.product_id = ${productId}
        and s.quantity = ${expected}
        and (select count(*) from ${productStock} where product_id = ${productId}) > 1
        and not exists (
          select 1 from ${orderItems} oi
          join ${orders} o on o.id = oi.order_id
          where oi.product_id = ${productId} and oi.size = s.size and o.status = 'pending'
        )
      returning s.id
    `);

    if (rows.length === 0) {
      refresh();
      return { error: await removeRefusedReason(stockId, productId, expected) };
    }
  } catch (error) {
    console.error("Removing a size failed", error);
    return { error: UNEXPECTED_ERROR };
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
}

async function removeRefusedReason(stockId: number, productId: number, expected: number) {
  const sizes = await db
    .select({ id: productStock.id, size: productStock.size, quantity: productStock.quantity })
    .from(productStock)
    .where(eq(productStock.productId, productId));
  const row = sizes.find((s) => s.id === stockId);
  if (!row) return "This size no longer exists.";
  if (sizes.length === 1) return "A product needs at least one size. Set its stock to 0 instead.";
  if (row.quantity !== expected) {
    return `Stock changed to ${row.quantity} since you opened this page. Review it and try again.`;
  }
  return "Customers are checking out with this size. Try again once those checkouts finish or expire.";
}

/** Moves a size one place up or down; rewrites every position as 0..n. */
export async function moveSize(
  _prev: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await assertAdmin();

  const stockId = positiveInt(formData.get("stockId"));
  const productId = positiveInt(formData.get("productId"));
  const direction = formData.get("direction");
  if (!stockId || !productId || (direction !== "up" && direction !== "down")) {
    return { error: "Unknown size." };
  }

  try {
    const rows = await db
      .select({ id: productStock.id })
      .from(productStock)
      .where(eq(productStock.productId, productId))
      .orderBy(asc(productStock.position), asc(productStock.id));
    const ids = rows.map((row) => row.id);
    const from = ids.indexOf(stockId);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from === -1) return { error: "This size no longer exists." };
    if (to < 0 || to >= ids.length) return {};
    [ids[from], ids[to]] = [ids[to], ids[from]];

    const positions = sql.join(
      ids.map((id, position) => sql`(${id}::int, ${position}::int)`),
      sql`, `,
    );
    await db.execute(sql`
      update ${productStock} s
      set position = v.position
      from (values ${positions}) as v(id, position)
      where s.id = v.id and s.product_id = ${productId}
    `);
  } catch (error) {
    console.error("Moving a size failed", error);
    return { error: UNEXPECTED_ERROR };
  }

  revalidatePath("/", "layout");
  return {};
}
