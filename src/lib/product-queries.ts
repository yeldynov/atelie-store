import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { categories, products, productStock } from "@/db/schema";
import type { Product } from "./products";

const withRelations = {
  category: { columns: { slug: true, name: true } },
  stock: {
    columns: { size: true, quantity: true },
    orderBy: asc(productStock.position),
  },
} as const;

type ProductRow = NonNullable<
  Awaited<ReturnType<typeof queryProduct>>
>;

function queryProduct(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: withRelations,
  });
}

function toProduct(row: ProductRow): Product {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category.name,
    categorySlug: row.category.slug,
    price: row.priceCents,
    badge: row.badge ?? undefined,
    images: row.images,
    description: row.description,
    details: row.details,
    stock: row.stock,
  };
}

/** Deduplicated per request, so metadata and the page share one query. */
export const getProduct = cache(async (slug: string) => {
  const row = await queryProduct(slug);
  return row ? toProduct(row) : undefined;
});

/** Products in the given order; unknown slugs are skipped. */
export async function getProductsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: inArray(products.slug, slugs),
    with: withRelations,
  });
  const bySlug = new Map(rows.map((row) => [row.slug, toProduct(row)]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

export async function getProductSlugs() {
  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

/** Most recently added first; id breaks ties within one insert. */
export async function getNewArrivals(limit = 24) {
  const rows = await db.query.products.findMany({
    with: withRelations,
    orderBy: [desc(products.createdAt), desc(products.id)],
    limit,
  });
  return rows.map(toProduct);
}

/**
 * Categories that have at least one product, by name. Deduplicated per
 * request, so the header and the homepage share one query.
 */
export const getCategories = cache(async () => {
  return db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(
      exists(
        db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.categoryId, categories.id)),
      ),
    )
    .orderBy(asc(categories.name));
});

export async function getCategorySlugs() {
  const rows = await db.select({ slug: categories.slug }).from(categories);
  return rows.map((row) => row.slug);
}

/** Deduplicated per request, so metadata and the page share one query. */
export const getCategory = cache(async (slug: string) => {
  const row = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    columns: { name: true },
    with: {
      products: { with: withRelations, orderBy: asc(products.id) },
    },
  });
  if (!row) return undefined;
  return { name: row.name, products: row.products.map(toProduct) };
});

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/**
 * Products where every word of the query appears in the name, category or
 * description, case-insensitively. Name matches first, then catalog order.
 */
export async function searchProducts(query: string, limit = 48) {
  const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  if (terms.length === 0) return [];

  const matchesTerm = (term: string) => {
    const pattern = `%${escapeLike(term)}%`;
    return or(
      ilike(products.name, pattern),
      ilike(products.description, pattern),
      exists(
        db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.id, products.categoryId),
              ilike(categories.name, pattern),
            ),
          ),
      ),
    );
  };
  const nameMatches = and(
    ...terms.map((term) => ilike(products.name, `%${escapeLike(term)}%`)),
  );

  const rows = await db.query.products.findMany({
    where: and(...terms.map(matchesTerm)),
    with: withRelations,
    orderBy: [desc(sql`coalesce(${nameMatches}, false)`), asc(products.id)],
    limit,
  });
  return rows.map(toProduct);
}

/** Same category first, then everything else, excluding the product itself. */
export async function getRelatedProducts(slug: string, limit = 4) {
  const current = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    columns: { id: true, categoryId: true },
  });
  if (!current) return [];

  const rows = await db.query.products.findMany({
    where: ne(products.id, current.id),
    with: withRelations,
    orderBy: [
      desc(sql`${products.categoryId} = ${current.categoryId}`),
      asc(products.id),
    ],
    limit,
  });
  return rows.map(toProduct);
}
