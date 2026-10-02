"use server";

import { eq, sql } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, productStock } from "@/db/schema";
import {
  formatPriceInput,
  type ProductFieldErrors,
  type ProductFormValues,
  type ProductInput,
  readProductForm,
  validateProduct,
} from "@/lib/admin-validation";
import { isForeignKeyViolation, pgErrorCode } from "@/lib/orders";
import { assertAdmin } from "@/lib/session";

// Every action checks the admin role first: server actions can be called
// directly, so the admin pages' own checks don't protect them.

export type ProductFormState = {
  status?: "saved";
  error?: string;
  fieldErrors?: ProductFieldErrors;
  values?: ProductFormValues;
};

const UNEXPECTED_ERROR = "Something went wrong on our side. Please try again.";

/** Maps constraint violations to the field the admin can fix. */
function writeError(error: unknown, values: ProductFormValues): ProductFormState | undefined {
  const code = pgErrorCode(error);
  if (code === "23505") {
    return { fieldErrors: { slug: "Another product already uses this slug." }, values };
  }
  if (code === "23503") {
    return { fieldErrors: { categoryId: "That category no longer exists. Choose another." }, values };
  }
  return undefined;
}

// Storefront pages are ISR (revalidate = 60); refresh them now so catalog
// changes show up immediately, including the header's category list.
const revalidateStorefront = () => revalidatePath("/", "layout");

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await assertAdmin();

  const values = readProductForm(formData);
  const { input, errors } = validateProduct(values, "create");
  if (!input) return { fieldErrors: errors, values };

  let id: number;
  try {
    // The HTTP driver has no interactive transactions, so take the id first
    // and write the product and its stock rows in one batch (one transaction).
    const { rows } = await db.execute<{ id: number }>(
      sql`select nextval(pg_get_serial_sequence('products', 'id'))::int as id`,
    );
    id = rows[0].id;
    await db.batch([
      db.insert(products).values({
        id,
        slug: input.slug,
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        badge: input.badge,
        description: input.description,
        details: input.details,
        images: input.images,
      }),
      db.insert(productStock).values(
        input.sizes.map((size, position) => ({ productId: id, size, quantity: 0, position })),
      ),
    ]);
  } catch (error) {
    const known = writeError(error, values);
    if (known) return known;
    console.error("Product create failed", error);
    return { error: UNEXPECTED_ERROR, values };
  }

  revalidateStorefront();
  redirect(`/admin/products/${id}/stock?created=1`);
}

export async function updateProduct(
  productId: number,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await assertAdmin();
  if (!Number.isInteger(productId) || productId <= 0) return { error: "Unknown product." };

  const values = readProductForm(formData);
  const { input, errors } = validateProduct(values, "update");
  if (!input) return { fieldErrors: errors, values };

  try {
    // Slug and sizes are not updatable here.
    const updated = await db
      .update(products)
      .set({
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        badge: input.badge,
        description: input.description,
        details: input.details,
        images: input.images,
      })
      .where(eq(products.id, productId))
      .returning({ id: products.id });
    if (updated.length === 0) return { error: "This product no longer exists.", values };
  } catch (error) {
    const known = writeError(error, values);
    if (known) return known;
    console.error("Product update failed", error);
    return { error: UNEXPECTED_ERROR, values };
  }

  revalidateStorefront();
  return { status: "saved", values: toFormValues(input, values) };
}

export type DeleteProductState = { error?: string };

/**
 * Deletes a product that was never ordered, with its stock rows (cascade).
 * Order lines restrict the delete, so ordered products stay as order history.
 */
export async function deleteProduct(productId: number): Promise<DeleteProductState> {
  await assertAdmin();
  if (!Number.isInteger(productId) || productId <= 0) return { error: "Unknown product." };

  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning({ id: products.id });
    if (deleted.length === 0) return { error: "This product no longer exists." };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      refresh();
      return {
        error:
          "This product has orders, so it's kept for order history. Set its stock to 0 to stop selling it.",
      };
    }
    console.error("Product delete failed", error);
    return { error: UNEXPECTED_ERROR };
  }

  revalidateStorefront();
  redirect("/admin/products?deleted=1");
}

/** The saved values, normalized the way they were stored. */
function toFormValues(input: ProductInput, sent: ProductFormValues): ProductFormValues {
  return {
    ...sent,
    name: input.name,
    price: formatPriceInput(input.priceCents),
    badge: input.badge ?? "",
    description: input.description,
    details: input.details.join("\n"),
    images: input.images,
  };
}
