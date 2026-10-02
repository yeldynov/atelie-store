// Input rules for admin catalog forms. Server actions are the real check;
// form inputs only mirror the limits with native attributes.

import { ONE_SIZE, type ProductImage } from "./products";

export const PRODUCT_LIMITS = {
  name: 120,
  slug: 80,
  badge: 30,
  description: 2000,
  detail: 200,
  details: 20,
  images: 8,
  alt: 200,
  size: 20,
  sizes: 20,
  // $99,999.99
  priceCents: 9_999_999,
  quantity: 100_000,
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

// Must match images.remotePatterns in next.config.ts, or next/image refuses
// to render the product.
const IMAGE_HOST = "images.unsplash.com";
const IMAGE_PATH_PREFIX = "/photo-";

export type ProductField =
  | "name"
  | "slug"
  | "categoryId"
  | "price"
  | "badge"
  | "description"
  | "details"
  | "images"
  | "sizes";

export type ProductFieldErrors = Partial<Record<ProductField, string>>;

/** What the form sends, as strings, so it can be shown back after an error. */
export type ProductFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  badge: string;
  description: string;
  details: string;
  images: ProductImage[];
  sizes: string;
};

export type ProductInput = {
  name: string;
  slug: string;
  categoryId: number;
  priceCents: number;
  badge: string | null;
  description: string;
  details: string[];
  images: ProductImage[];
  sizes: string[];
};

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_LIMITS.slug)
    .replace(/-+$/, "");
}

/** "1250", "1250.5" or "1250.50" → 125050. Never goes through a float. */
export function parsePriceCents(value: string): number | undefined {
  const match = PRICE_PATTERN.exec(value.trim().replace(/,/g, ""));
  if (!match) return undefined;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents <= PRODUCT_LIMITS.priceCents ? cents : undefined;
}

/** 125050 → "1250.50"; whole amounts drop the decimals. */
export function formatPriceInput(cents: number) {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(whole) : `${whole}.${String(rest).padStart(2, "0")}`;
}

export function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === IMAGE_HOST &&
      url.pathname.startsWith(IMAGE_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}

export function readProductForm(formData: FormData): ProductFormValues {
  const srcs = formData.getAll("imageSrc");
  const alts = formData.getAll("imageAlt");
  return {
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    categoryId: text(formData, "categoryId"),
    price: text(formData, "price"),
    badge: text(formData, "badge"),
    description: text(formData, "description"),
    details: text(formData, "details"),
    images: srcs.map((src, i) => ({
      src: typeof src === "string" ? src.trim() : "",
      alt: typeof alts[i] === "string" ? (alts[i] as string).trim() : "",
    })),
    sizes: text(formData, "sizes"),
  };
}

/**
 * Validates a product form. `mode` "update" skips slug and sizes, which are
 * set once at creation (order snapshots and links use the slug; stock rows
 * own the sizes).
 */
export function validateProduct(
  values: ProductFormValues,
  mode: "create" | "update",
): { input?: ProductInput; errors: ProductFieldErrors } {
  const errors: ProductFieldErrors = {};
  const L = PRODUCT_LIMITS;

  const name = values.name.trim();
  if (!name) errors.name = "Enter a product name.";
  else if (name.length > L.name) errors.name = `Use at most ${L.name} characters.`;

  const slug = values.slug.trim();
  if (mode === "create") {
    if (!slug) errors.slug = "Enter a URL slug.";
    else if (slug.length > L.slug) errors.slug = `Use at most ${L.slug} characters.`;
    else if (!SLUG_PATTERN.test(slug)) {
      errors.slug = "Use lowercase letters, numbers and single hyphens, like wool-coat.";
    }
  }

  const categoryId = Number(values.categoryId);
  if (!values.categoryId || !Number.isInteger(categoryId) || categoryId <= 0) {
    errors.categoryId = "Choose a category.";
  }

  const priceCents = parsePriceCents(values.price);
  if (!values.price.trim()) errors.price = "Enter a price.";
  else if (priceCents === undefined) {
    errors.price = "Enter a price in dollars, like 1250 or 1250.50, up to 99,999.99.";
  }

  const badge = values.badge.trim();
  if (badge.length > L.badge) errors.badge = `Use at most ${L.badge} characters.`;

  const description = values.description.trim();
  if (!description) errors.description = "Enter a description.";
  else if (description.length > L.description) {
    errors.description = `Use at most ${L.description} characters.`;
  }

  const details = values.details
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (details.length > L.details) errors.details = `Add at most ${L.details} details.`;
  else if (details.some((line) => line.length > L.detail)) {
    errors.details = `Keep each detail to ${L.detail} characters.`;
  }

  // Rows left completely empty are ignored.
  const images = values.images.filter((image) => image.src || image.alt);
  if (images.length === 0) errors.images = "Add at least one image.";
  else if (images.length > L.images) errors.images = `Add at most ${L.images} images.`;
  else if (images.some((image) => !isAllowedImageUrl(image.src))) {
    errors.images = `Each image must be an https://${IMAGE_HOST}${IMAGE_PATH_PREFIX}… URL.`;
  } else if (images.some((image) => !image.alt)) {
    errors.images = "Describe each image in its alt text.";
  } else if (images.some((image) => image.alt.length > L.alt)) {
    errors.images = `Keep alt text to ${L.alt} characters.`;
  }

  let sizes: string[] = [];
  if (mode === "create") {
    sizes = values.sizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean);
    if (sizes.length === 0) sizes = [ONE_SIZE];
    const sizeError = validateSizes(sizes);
    if (sizeError) errors.sizes = sizeError;
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    input: {
      name,
      slug,
      categoryId,
      priceCents: priceCents!,
      badge: badge || null,
      description,
      details,
      images,
      sizes,
    },
  };
}

/** Checks a full list of sizes for one product. */
export function validateSizes(sizes: string[]): string | undefined {
  const L = PRODUCT_LIMITS;
  if (sizes.length > L.sizes) return `Add at most ${L.sizes} sizes.`;
  if (sizes.some((size) => size.length > L.size)) {
    return `Keep each size to ${L.size} characters.`;
  }
  const lower = sizes.map((size) => size.toLowerCase());
  if (new Set(lower).size !== lower.length) return "Each size can only be listed once.";
  if (sizes.length > 1 && sizes.includes(ONE_SIZE)) {
    return `"${ONE_SIZE}" can't be combined with other sizes.`;
  }
  return undefined;
}

/** A stock quantity from a form: a whole number from 0 up to the limit. */
export function parseQuantity(value: string): number | undefined {
  if (!/^\d{1,6}$/.test(value.trim())) return undefined;
  const quantity = Number(value);
  return quantity <= PRODUCT_LIMITS.quantity ? quantity : undefined;
}

/** A product id from a URL segment, or undefined. */
export const parseProductId = (value: string) =>
  /^\d{1,9}$/.test(value) && Number(value) > 0 ? Number(value) : undefined;

export const CATEGORY_LIMITS = { name: 60, slug: 60 };

export type CategoryField = "name" | "slug";
export type CategoryFieldErrors = Partial<Record<CategoryField, string>>;

/** Category name, and slug when creating (it can't change afterwards). */
export function validateCategory(
  values: { name: string; slug?: string },
  mode: "create" | "rename",
): { input?: { name: string; slug: string }; errors: CategoryFieldErrors } {
  const errors: CategoryFieldErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter a category name.";
  else if (name.length > CATEGORY_LIMITS.name) {
    errors.name = `Use at most ${CATEGORY_LIMITS.name} characters.`;
  }

  const slug = (values.slug ?? "").trim();
  if (mode === "create") {
    if (!slug) errors.slug = "Enter a URL slug.";
    else if (slug.length > CATEGORY_LIMITS.slug) {
      errors.slug = `Use at most ${CATEGORY_LIMITS.slug} characters.`;
    } else if (!SLUG_PATTERN.test(slug)) {
      errors.slug = "Use lowercase letters, numbers and single hyphens, like knitwear.";
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, input: { name, slug } };
}

/** A positive integer id from a form field, or undefined. */
export function parseId(value: FormDataEntryValue | null): number | undefined {
  return typeof value === "string" ? parseProductId(value) : undefined;
}
