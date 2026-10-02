import "server-only";

import type Stripe from "stripe";
import { db } from "@/db";
import type { OrderShipping } from "@/db/schema";
import type { Bag } from "./bag";
import {
  attachCheckoutSession,
  createPendingOrder,
  getOrder,
  getUnpaidPendingOrders,
  isEventProcessed,
  markOrderPaidQuery,
  markOrderProcessingQuery,
  recordEventQuery,
  releaseOrder,
  releaseOrderQuery,
  type CancelReason,
} from "./orders";
import { appUrl, getStripe } from "./stripe";

// Stripe Checkout on top of src/lib/orders.ts. Prices, totals and stock come
// from the database; Stripe receives them as inline price_data and owns the
// payment page. Orders become paid only in handleCheckoutEvent, from verified
// webhook events.

// Labels these sessions in the Stripe Dashboard.
const INTEGRATION_IDENTIFIER = "atelier-checkout-kqzmrvtd";
// Countries Stripe Checkout lets the customer ship to.
const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US"];

export type StartCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

const UNEXPECTED_ERROR = "We couldn't start checkout. Please try again.";

/**
 * Reserves the bag's stock in a new pending order and opens a Stripe Checkout
 * Session for it. Call abandonUnpaidCheckouts first and resolve the bag after
 * it, so stock the customer's earlier checkout held is free again.
 */
export async function startCheckout(
  user: { id: string; email: string },
  bag: Bag,
): Promise<StartCheckoutResult> {
  const created = await createPendingOrder(user.id, bag);
  if (!created.ok) return created;
  const { order } = created;

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: order.currency,
            unit_amount: item.unitPriceCents,
            product_data: {
              name: item.productName,
              images: item.image?.startsWith("https://") ? [item.image] : undefined,
            },
          },
        })),
        client_reference_id: order.id,
        metadata: { order_id: order.id },
        payment_intent_data: { metadata: { order_id: order.id } },
        customer_email: user.email,
        shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
        expires_at: Math.floor(order.reservedUntil.getTime() / 1000),
        success_url: `${appUrl("/checkout/success")}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: appUrl(`/checkout/cancel?order=${order.id}`),
        integration_identifier: INTEGRATION_IDENTIFIER,
      },
      { idempotencyKey: `checkout-session-${order.id}` },
    );
  } catch (error) {
    // The SDK already retried with the same idempotency key, so no session
    // the customer could pay exists; give the stock back.
    console.error("Stripe Checkout Session creation failed", error);
    await releaseOrder(order.id, "session_create_failed");
    return { ok: false, error: UNEXPECTED_ERROR };
  }

  try {
    await attachCheckoutSession(order.id, session.id);
  } catch (error) {
    // Without the session id we can't find this order from the success page;
    // close the session so it can't be paid, then release.
    console.error("Saving the Checkout Session on the order failed", error);
    await expireSession(session.id).catch(() => {});
    await releaseOrder(order.id, "session_create_failed");
    return { ok: false, error: UNEXPECTED_ERROR };
  }

  if (!session.url) {
    await abandonCheckout(order.id, session.id);
    return { ok: false, error: UNEXPECTED_ERROR };
  }
  return { ok: true, url: session.url };
}

async function expireSession(sessionId: string) {
  await getStripe().checkout.sessions.expire(sessionId);
}

/**
 * Closes a pending order's Checkout Session and returns its stock, unless the
 * customer already completed payment there.
 */
export async function abandonCheckout(orderId: string, sessionId: string | null) {
  if (!sessionId) {
    // Session creation never finished, so there is nothing to pay.
    await releaseOrder(orderId, "session_create_failed");
    return;
  }

  const stripe = getStripe();
  let session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "open") {
    try {
      session = await stripe.checkout.sessions.expire(sessionId);
    } catch {
      // Completed between retrieve and expire; leave it to the webhook.
      session = await stripe.checkout.sessions.retrieve(sessionId);
    }
  }
  // Only a session Stripe reports expired can no longer be paid.
  if (session.status === "expired") {
    await releaseOrder(orderId, "checkout_cancelled");
  }
}

/** Cancels the user's unfinished checkouts, so starting again doesn't hold stock twice. */
export async function abandonUnpaidCheckouts(userId: string) {
  for (const order of await getUnpaidPendingOrders(userId)) {
    await abandonCheckout(order.id, order.stripeCheckoutSessionId);
  }
}

// --- Webhooks -------------------------------------------------------------

const HANDLED_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

function paymentDetails(session: Stripe.Checkout.Session) {
  const shipping = session.collected_information?.shipping_details;
  return {
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    email: session.customer_details?.email ?? null,
    shipping: shipping
      ? ({
          name: shipping.name,
          address: {
            line1: shipping.address.line1,
            line2: shipping.address.line2,
            city: shipping.address.city,
            state: shipping.address.state,
            postal_code: shipping.address.postal_code,
            country: shipping.address.country,
          },
        } satisfies OrderShipping)
      : null,
  };
}

/**
 * Applies a verified Stripe event to its order. Safe to call any number of
 * times for the same event: processed events are skipped, and every status
 * change is guarded by the order's current status. Throws on database errors
 * so the webhook returns 500 and Stripe redelivers.
 */
export async function handleCheckoutEvent(event: Stripe.Event) {
  if (!HANDLED_EVENTS.has(event.type)) return;
  if (await isEventProcessed(event.id)) return;

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  const order = orderId ? await getOrder(orderId) : undefined;

  if (!order) {
    console.error(`Stripe ${event.type} ${event.id}: no order for session ${session.id}`);
    await recordEventQuery(event, null);
    return;
  }
  if (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== session.id) {
    console.error(
      `Stripe ${event.type} ${event.id}: session ${session.id} doesn't match order ${order.id}`,
    );
    await recordEventQuery(event, order.id);
    return;
  }

  const record = recordEventQuery(event, order.id);
  const release = (reason: CancelReason) =>
    db.batch([releaseOrderQuery(order.id, reason), record]);

  switch (event.type) {
    case "checkout.session.expired":
      await release("expired");
      return;
    case "checkout.session.async_payment_failed":
      await release("payment_failed");
      return;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const settled =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required";

      if (!settled) {
        // A delayed payment method: Stripe sends async_payment_succeeded or
        // async_payment_failed later.
        await db.batch([markOrderProcessingQuery(order.id, paymentDetails(session)), record]);
        return;
      }

      // The session was built from this order, so these always match unless
      // something is badly wrong; never confirm an order for a different amount.
      if (session.amount_total !== order.totalCents || session.currency !== order.currency) {
        console.error(
          `Stripe ${event.id}: session ${session.id} charged ${session.amount_total} ${session.currency}, ` +
            `order ${order.id} expects ${order.totalCents} ${order.currency}. Not confirming; review manually.`,
        );
        await record;
        return;
      }
      if (order.status === "cancelled") {
        console.error(
          `Stripe ${event.id}: order ${order.id} was paid after it was cancelled and its stock released. Refund or fulfil manually.`,
        );
      }
      await db.batch([markOrderPaidQuery(order.id, paymentDetails(session)), record]);
      return;
    }
  }
}
