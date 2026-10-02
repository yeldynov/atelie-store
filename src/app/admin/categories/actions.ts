"use server";

import { eq } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { type CategoryFieldErrors, validateCategory } from "@/lib/admin-validation";
import { isForeignKeyViolation, pgErrorCode } from "@/lib/orders";
import { assertAdmin } from "@/lib/session";

// Every action checks the admin role first: server actions can be called
// directly, so the admin pages' own checks don't protect them.

export type CategoryFormState = {
  status?: "saved";
  error?: string;
  fieldErrors?: CategoryFieldErrors;
  values?: { name: string; slug: string };
};

const UNEXPECTED_ERROR = "Something went wrong on our side. Please try again.";

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** The violated constraint's name from a failed query (drizzle wraps it). */
function pgConstraint(error: unknown): string | undefined {
  for (let e = error; e instanceof Error; e = e.cause) {
    const constraint = (e as { constraint?: unknown }).constraint;
    if (typeof constraint === "string") return constraint;
  }
  return undefined;
}

/** Categories have a unique slug and a unique name; say which one clashed. */
function duplicateError(error: unknown): CategoryFieldErrors | undefined {
  if (pgErrorCode(error) !== "23505") return undefined;
  return pgConstraint(error) === "categories_slug_unique"
    ? { slug: "Another category already uses this slug." }
    : { name: "Another category already has this name." };
}

// The header lists categories and collection pages are ISR; refresh them now.
const revalidateStorefront = () => revalidatePath("/", "layout");

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await assertAdmin();

  const values = { name: text(formData, "name"), slug: text(formData, "slug") };
  const { input, errors } = validateCategory(values, "create");
  if (!input) return { fieldErrors: errors, values };

  try {
    await db.insert(categories).values({ name: input.name, slug: input.slug });
  } catch (error) {
    const fieldErrors = duplicateError(error);
    if (fieldErrors) return { fieldErrors, values };
    console.error("Category create failed", error);
    return { error: UNEXPECTED_ERROR, values };
  }

  revalidateStorefront();
  // Cleared form for the next one.
  return { status: "saved", values: { name: "", slug: "" } };
}

export async function renameCategory(
  categoryId: number,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await assertAdmin();
  if (!Number.isInteger(categoryId) || categoryId <= 0) return { error: "Unknown category." };

  const values = { name: text(formData, "name"), slug: "" };
  const { input, errors } = validateCategory(values, "rename");
  if (!input) return { fieldErrors: errors, values };

  try {
    // Only the name: the slug is in collection URLs and can't change.
    const updated = await db
      .update(categories)
      .set({ name: input.name })
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id });
    if (updated.length === 0) return { error: "This category no longer exists.", values };
  } catch (error) {
    const fieldErrors = duplicateError(error);
    if (fieldErrors) return { fieldErrors, values };
    console.error("Category rename failed", error);
    return { error: UNEXPECTED_ERROR, values };
  }

  revalidateStorefront();
  return { status: "saved", values: { name: input.name, slug: "" } };
}

/** Deletes an empty category. Products restrict the delete, so a category in use stays. */
export async function deleteCategory(categoryId: number): Promise<CategoryFormState> {
  await assertAdmin();
  if (!Number.isInteger(categoryId) || categoryId <= 0) return { error: "Unknown category." };

  try {
    const deleted = await db
      .delete(categories)
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id });
    if (deleted.length === 0) return { error: "This category no longer exists." };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      // The page showed it as empty; reload the real product count.
      refresh();
      return { error: "This category has products. Move them to another category first." };
    }
    console.error("Category delete failed", error);
    return { error: UNEXPECTED_ERROR };
  }

  revalidateStorefront();
  return { status: "saved" };
}
