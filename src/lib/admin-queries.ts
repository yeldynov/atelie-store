import "server-only";

import { and, asc, count, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { isOrderId } from "./orders";
import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  products,
  productStock,
  user,
} from "@/db/schema";
import { escapeLike } from "./product-queries";
import { assertAdmin } from "./session";

// Admin-only reads. Each function checks the role itself, so the data stays
// protected whichever page or action calls it.

export async function getAdminOverview(recentLimit = 20) {
  await assertAdmin();
  const [[users], [catalog], recentUsers] = await db.batch([
    db.select({ total: count() }).from(user),
    db.select({ total: count() }).from(products),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(recentLimit),
  ]);
  return { userCount: users.total, productCount: catalog.total, recentUsers };
}

/** Products with their category and total units on hand, newest first. */
export async function getAdminProducts(filters: { q?: string; categoryId?: number } = {}) {
  await assertAdmin();
  const where: SQL[] = [];
  const q = filters.q?.trim();
  if (q) where.push(ilike(products.name, `%${escapeLike(q)}%`));
  if (filters.categoryId) where.push(eq(products.categoryId, filters.categoryId));

  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      images: products.images,
      category: categories.name,
      units: sql<number>`coalesce(sum(${productStock.quantity}), 0)::int`,
      sizes: sql<number>`count(${productStock.id})::int`,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .where(where.length > 0 ? and(...where) : undefined)
    .groupBy(products.id, categories.name)
    .orderBy(desc(products.createdAt), desc(products.id));
}

/** One product with its category and stock rows in display order. */
export async function getAdminProduct(id: number) {
  await assertAdmin();
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      category: { columns: { slug: true, name: true } },
      stock: { orderBy: [asc(productStock.position), asc(productStock.id)] },
    },
  });
}

/** Every category, for the product form's category picker. */
export async function getAdminCategoryOptions() {
  await assertAdmin();
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));
}

/**
 * Units of a product held by pending orders, per size. product_stock already
 * excludes them; this shows admins why stock is lower than what's on the shelf.
 */
export async function getHeldUnits(productId: number) {
  await assertAdmin();
  const rows = await db
    .select({
      size: orderItems.size,
      held: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.productId, productId), eq(orders.status, "pending")))
    .groupBy(orderItems.size);
  return new Map(rows.map((row) => [row.size, row.held]));
}

/** How many order lines reference a product; ordered products can't be deleted. */
export async function getProductOrderCount(productId: number) {
  await assertAdmin();
  const [row] = await db
    .select({ total: count() })
    .from(orderItems)
    .where(eq(orderItems.productId, productId));
  return row.total;
}

/** Every category with how many products it holds. */
export async function getAdminCategories() {
  await assertAdmin();
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

export const ADMIN_ORDERS_PAGE_SIZE = 50;
export type AdminOrderStatus = "pending" | "confirmed" | "cancelled";

/** All customers' orders, newest first, one page at a time. */
export async function getAdminOrders({
  status,
  page = 1,
}: { status?: AdminOrderStatus; page?: number } = {}) {
  await assertAdmin();
  const where = status ? eq(orders.status, status) : undefined;
  const [rows, [total]] = await db.batch([
    db
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
        customerEmail: user.email,
        units: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
      })
      .from(orders)
      .innerJoin(user, eq(user.id, orders.userId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(ADMIN_ORDERS_PAGE_SIZE)
      .offset((page - 1) * ADMIN_ORDERS_PAGE_SIZE),
    db.select({ count: count() }).from(orders).where(where),
  ]);
  return { rows, total: total.count };
}

/** Any customer's order with its lines and customer, for the admin detail page. */
export async function getAdminOrder(orderId: string) {
  await assertAdmin();
  if (!isOrderId(orderId)) return undefined;
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: { orderBy: asc(orderItems.id) },
      user: { columns: { name: true, email: true } },
    },
  });
}
