import "server-only";

import { asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { products, productStock } from "@/db/schema";
import type { Product } from "./products";

const withRelations = {
  category: { columns: { name: true } },
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
