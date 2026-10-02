// Order tables: orders, their line items, and processed Stripe webhook events.

import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products, type ProductImage } from "./catalog";

// Order lifecycle. "pending" holds a stock reservation until payment settles or
// the Stripe session expires; "cancelled" means that reservation was released.
export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "cancelled",
]);

// Payment state as last confirmed by Stripe, never by the client.
// "processing": checkout completed but a delayed payment method hasn't settled.
export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "processing",
  "paid",
  "failed",
]);

export const cancelReason = pgEnum("order_cancel_reason", [
  "expired",
  "payment_failed",
  "session_create_failed",
  // The customer left Stripe Checkout, or started a new checkout instead.
  "checkout_cancelled",
]);

// Stripe's shipping_details, stored as returned.
export type OrderShipping = {
  name: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
};

export const orders = pgTable(
  "orders",
  {
    // Random, so ids in URLs can't be enumerated.
    id: uuid("id").primaryKey().defaultRandom(),
    // Orders are financial records: a user with orders can't be deleted.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    cancelReason: cancelReason("cancel_reason"),
    currency: text("currency").notNull().default("usd"),
    // All amounts in cents, computed server-side from product rows.
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    // From the Stripe session once paid.
    email: text("email"),
    shipping: jsonb("shipping").$type<OrderShipping>(),
    // When the stock reservation lapses; matches the session's expires_at.
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_user_id_created_at_idx").on(t.userId, t.createdAt.desc()),
    // For releasing reservations whose webhook never arrived.
    index("orders_status_reserved_until_idx").on(t.status, t.reservedUntil),
    check("orders_subtotal_cents_non_negative", sql`${t.subtotalCents} >= 0`),
    check("orders_shipping_cents_non_negative", sql`${t.shippingCents} >= 0`),
    check(
      "orders_total_cents_sum",
      sql`${t.totalCents} = ${t.subtotalCents} + ${t.shippingCents}`,
    ),
    check("orders_currency_code", sql`${t.currency} ~ '^[a-z]{3}$'`),
    // Status and payment status move together; these are the legal pairs.
    check(
      "orders_status_payment_status",
      sql`(${t.status} = 'pending' and ${t.paymentStatus} in ('unpaid', 'processing'))
        or (${t.status} = 'confirmed' and ${t.paymentStatus} = 'paid')
        or (${t.status} = 'cancelled' and ${t.paymentStatus} in ('unpaid', 'failed'))`,
    ),
    check(
      "orders_paid_fields",
      sql`(${t.paymentStatus} = 'paid') = (${t.paidAt} is not null)
        and (${t.paymentStatus} <> 'paid' or ${t.stripeCheckoutSessionId} is not null)`,
    ),
    check(
      "orders_cancelled_fields",
      sql`(${t.status} = 'cancelled') = (${t.cancelledAt} is not null)
        and (${t.status} = 'cancelled') = (${t.cancelReason} is not null)`,
    ),
  ],
);

// Snapshots of what was bought, so later catalog edits don't change past orders.
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Products that have been ordered can't be deleted.
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    size: text("size").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug").notNull(),
    image: jsonb("image").$type<ProductImage>(),
  },
  (t) => [
    unique("order_items_order_id_product_id_size_unique").on(
      t.orderId,
      t.productId,
      t.size,
    ),
    index("order_items_product_id_idx").on(t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "order_items_unit_price_cents_non_negative",
      sql`${t.unitPriceCents} >= 0`,
    ),
  ],
);

// One row per Stripe webhook event that changed (or was checked against) our
// data. Inserted in the same batch as the change, so redeliveries are skipped.
export const stripeEvents = pgTable("stripe_events", {
  // Stripe event id (evt_...).
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  orderId: uuid("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
