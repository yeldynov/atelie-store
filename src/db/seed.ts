// Loads the sample catalog. Safe to re-run: rows are upserted by slug
// (and by product + size for stock). Run with `pnpm db:seed`.

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { categories, products, productStock } from "./schema";
import { seedProducts } from "./seed-data";

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const excluded = (column: string) => sql.raw(`excluded."${column}"`);

async function main() {
  const categoryNames = [...new Set(seedProducts.map((p) => p.category))];

  const categoryRows = await db
    .insert(categories)
    .values(categoryNames.map((name) => ({ slug: slugify(name), name })))
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: excluded("name") },
    })
    .returning({ id: categories.id, name: categories.name });
  const categoryIds = new Map(categoryRows.map((c) => [c.name, c.id]));

  const productRows = await db
    .insert(products)
    .values(
      seedProducts.map((p) => ({
        slug: p.slug,
        name: p.name,
        categoryId: categoryIds.get(p.category)!,
        priceCents: p.price * 100,
        badge: p.badge ?? null,
        description: p.description,
        details: p.details,
        images: p.images,
      })),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: excluded("name"),
        categoryId: excluded("category_id"),
        priceCents: excluded("price_cents"),
        badge: excluded("badge"),
        description: excluded("description"),
        details: excluded("details"),
        images: excluded("images"),
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });
  const productIds = new Map(productRows.map((p) => [p.slug, p.id]));

  await db
    .insert(productStock)
    .values(
      seedProducts.flatMap((p) =>
        p.stock.map(([size, quantity], position) => ({
          productId: productIds.get(p.slug)!,
          size,
          quantity,
          position,
        })),
      ),
    )
    .onConflictDoUpdate({
      target: [productStock.productId, productStock.size],
      set: { quantity: excluded("quantity"), position: excluded("position") },
    });

  console.log(
    `Seeded ${categoryRows.length} categories and ${productRows.length} products.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
