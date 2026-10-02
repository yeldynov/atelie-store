import "server-only";

import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderItems,
  orders,
  productStock,
  products,
  stripeEvents,
  type OrderShipping,
} from "@/db/schema";
import type { Bag } from "./bag";

// Orders and their stock reservations. Payment status changes only through
// markOrderPaid / markOrderProcessing / releaseOrder, which are called with
// data from Stripe (webhook events), never with anything the browser sent.
//
// Every status change is a single conditional UPDATE guarded by the current
// status, so replaying it (duplicate webhooks, retries) changes nothing.

export type CancelReason = NonNullable<(typeof orders.$inferSelect)["cancelReason"]>;

// Stripe requires a session to stay open at least 30 minutes; one more covers
// the time between computing this and Stripe receiving the request.
const RESERVATION_MS = 31 * 60 * 1000;

/** The Postgres error code of a failed query, if any (drizzle wraps it). */
export function pgErrorCode(error: unknown): string | undefined {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

/**
 * Whether a query failed on a foreign key: 23503 when a row points at nothing,
 * 23001 when deleting a row that an ON DELETE RESTRICT key still points at.
 */
export function isForeignKeyViolation(error: unknown) {
  const code = pgErrorCode(error);
  return code === "23503" || code === "23001";
}

export type PendingOrder = {
  id: string;
  reservedUntil: Date;
  totalCents: number;
  currency: string;
  items: {
    productName: string;
    unitPriceCents: number;
    quantity: number;
    image: string | undefined;
  }[];
};

export type CreateOrderResult =
  | { ok: true; order: PendingOrder }
  | { ok: false; error: string };

/**
 * Creates a pending order from a bag already resolved against the database and
 * reserves its stock, all in one transaction. Fails without writing anything
 * if any line is no longer in stock.
 */
export async function createPendingOrder(
  userId: string,
  bag: Bag,
): Promise<CreateOrderResult> {
  if (bag.items.length === 0 || bag.items.some((item) => item.issue)) {
    return { ok: false, error: "Some items in your bag changed. Review your bag and try again." };
  }

  // The resolved bag has prices and stock but not product ids.
  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(inArray(products.slug, [...new Set(bag.items.map((item) => item.slug))]));
  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));

  const lines = bag.items.map((item) => ({
    productId: idBySlug.get(item.slug),
    item,
  }));
  if (lines.some((line) => line.productId === undefined)) {
    return { ok: false, error: "This item is no longer available." };
  }

  const id = crypto.randomUUID();
  const reservedUntil = new Date(Date.now() + RESERVATION_MS);
  const subtotalCents = bag.subtotal;
  const items = lines.map(({ productId, item }) => ({
    orderId: id,
    productId: productId!,
    size: item.size,
    quantity: item.quantity,
    unitPriceCents: item.unitPrice,
    productName: item.name,
    productSlug: item.slug,
    image: item.image ?? null,
  }));

  const reserve = sql.join(
    items.map(
      (item) => sql`(${item.productId}::int, ${item.size}::text, ${item.quantity}::int)`,
    ),
    sql`, `,
  );

  try {
    await db.batch([
      db.insert(orders).values({
        id,
        userId,
        subtotalCents,
        shippingCents: 0,
        totalCents: subtotalCents,
        reservedUntil,
      }),
      db.insert(orderItems).values(items),
      // Takes the units out of stock. If another checkout took them first, the
      // product_stock quantity check fails and the whole batch rolls back. If a
      // size row disappeared, fewer rows match and the 1/0 rolls it back too.
      db.execute(sql`
        with reserved as (
          update ${productStock} s
          set quantity = s.quantity - v.quantity
          from (values ${reserve}) as v(product_id, size, quantity)
          where s.product_id = v.product_id and s.size = v.size
          returning s.id
        )
        select 1 / (case when count(*) = ${items.length} then 1 else 0 end)
        from reserved
      `),
    ]);
  } catch (error) {
    const code = pgErrorCode(error);
    if (code === "23514") {
      return { ok: false, error: "Some items just sold out. Review your bag and try again." };
    }
    if (code === "22012") {
      return { ok: false, error: "Some items are no longer available. Review your bag and try again." };
    }
    throw error;
  }

  return {
    ok: true,
    order: {
      id,
      reservedUntil,
      totalCents: subtotalCents,
      currency: "usd",
      items: items.map((item) => ({
        productName: item.productName,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        image: item.image?.src,
      })),
    },
  };
}

/** Records the Stripe session on a pending order that doesn't have one yet. */
export async function attachCheckoutSession(orderId: string, sessionId: string) {
  const updated = await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, "pending"),
        isNull(orders.stripeCheckoutSessionId),
      ),
    )
    .returning({ id: orders.id });
  if (updated.length === 0) {
    throw new Error(`Order ${orderId} is not pending or already has a session`);
  }
}

/**
 * Cancels a pending order and returns its units to stock, in one statement.
 * Stock is restored only by the call that actually cancels the order, so
 * repeating it is a no-op. Returns the query so callers can batch it.
 */
export function releaseOrderQuery(orderId: string, reason: CancelReason) {
  return db.execute(sql`
    with cancelled as (
      update ${orders}
      set status = 'cancelled',
          payment_status = case when ${reason} = 'payment_failed'
            then 'failed'::payment_status else 'unpaid'::payment_status end,
          cancel_reason = ${reason}::order_cancel_reason,
          cancelled_at = now(),
          updated_at = now()
      where id = ${orderId} and status = 'pending'
      returning id
    )
    update ${productStock} s
    set quantity = s.quantity + oi.quantity
    from ${orderItems} oi
    join cancelled c on oi.order_id = c.id
    where s.product_id = oi.product_id and s.size = oi.size
  `);
}

export async function releaseOrder(orderId: string, reason: CancelReason) {
  await releaseOrderQuery(orderId, reason);
}

type PaymentDetails = {
  sessionId: string;
  paymentIntentId: string | null;
  email: string | null;
  shipping: OrderShipping | null;
};

// Applies only to the order's own session (or one not yet recorded).
const forSession = (orderId: string, sessionId: string) =>
  and(
    eq(orders.id, orderId),
    eq(orders.status, "pending"),
    or(
      isNull(orders.stripeCheckoutSessionId),
      eq(orders.stripeCheckoutSessionId, sessionId),
    ),
  );

/** Pending → confirmed / paid. A no-op unless the order is still pending. */
export function markOrderPaidQuery(orderId: string, payment: PaymentDetails) {
  return db
    .update(orders)
    .set({
      status: "confirmed",
      paymentStatus: "paid",
      paidAt: new Date(),
      stripeCheckoutSessionId: payment.sessionId,
      stripePaymentIntentId: payment.paymentIntentId,
      email: payment.email,
      shipping: payment.shipping,
    })
    .where(forSession(orderId, payment.sessionId));
}

/**
 * Pending / unpaid → pending / processing: checkout finished with a payment
 * method that settles later. The stock stays reserved until it does.
 */
export function markOrderProcessingQuery(orderId: string, payment: PaymentDetails) {
  return db
    .update(orders)
    .set({
      paymentStatus: "processing",
      stripeCheckoutSessionId: payment.sessionId,
      stripePaymentIntentId: payment.paymentIntentId,
      email: payment.email,
      shipping: payment.shipping,
    })
    .where(and(forSession(orderId, payment.sessionId), eq(orders.paymentStatus, "unpaid")));
}

export async function isEventProcessed(eventId: string) {
  const row = await db.query.stripeEvents.findFirst({
    where: eq(stripeEvents.id, eventId),
    columns: { id: true },
  });
  return row !== undefined;
}

export function recordEventQuery(
  event: { id: string; type: string },
  orderId: string | null,
) {
  return db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, orderId })
    .onConflictDoNothing();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isOrderId = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

export async function getOrder(orderId: string) {
  if (!isOrderId(orderId)) return undefined;
  return db.query.orders.findFirst({ where: eq(orders.id, orderId) });
}

/** The user's order for a Checkout Session, with its lines. */
export async function getOrderBySessionForUser(sessionId: string, userId: string) {
  return db.query.orders.findFirst({
    where: and(
      eq(orders.stripeCheckoutSessionId, sessionId),
      eq(orders.userId, userId),
    ),
    with: { items: { orderBy: asc(orderItems.id) } },
  });
}

/**
 * Pending orders still waiting for checkout to finish, newest first, with the
 * units each one holds.
 */
export async function getUnpaidPendingOrders(userId: string) {
  return db.query.orders.findMany({
    where: and(
      eq(orders.userId, userId),
      eq(orders.status, "pending"),
      eq(orders.paymentStatus, "unpaid"),
    ),
    columns: { id: true, stripeCheckoutSessionId: true, reservedUntil: true },
    with: { items: { columns: { productSlug: true, size: true, quantity: true } } },
    orderBy: desc(orders.createdAt),
  });
}

// Orders the customer actually placed: payment completed, settling, or
// declined. Open and abandoned checkouts (pending or cancelled while unpaid)
// are not shown in their history.
const placedOrder = inArray(orders.paymentStatus, ["paid", "processing", "failed"]);

/** The user's placed orders, newest first, for their order history. */
export async function getOrdersForUser(userId: string) {
  return db.query.orders.findMany({
    where: and(eq(orders.userId, userId), placedOrder),
    columns: {
      id: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
    },
    with: { items: { columns: { quantity: true } } },
    orderBy: desc(orders.createdAt),
  });
}

/** One of the user's placed orders, with its lines. Undefined for anyone else's. */
export async function getOrderForUser(orderId: string, userId: string) {
  if (!isOrderId(orderId)) return undefined;
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId), placedOrder),
    with: { items: { orderBy: asc(orderItems.id) } },
  });
}

export type Order = NonNullable<Awaited<ReturnType<typeof getOrderBySessionForUser>>>;
export type OrderStatus = Order["status"];
export type PaymentStatus = Order["paymentStatus"];

export const formatOrderNumber = (orderId: string) => `#${orderId.slice(0, 8).toUpperCase()}`;
