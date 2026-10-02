import type Stripe from "stripe";
import { handleCheckoutEvent } from "@/lib/checkout";
import { getStripe, getWebhookSecret } from "@/lib/stripe";

// Stripe webhook endpoint: the only place orders become paid. The signature is
// checked against the raw body before anything in it is trusted.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let stripe: Stripe;
  let secret: string;
  try {
    stripe = getStripe();
    secret = getWebhookSecret();
  } catch (error) {
    // Misconfiguration, not a bad request: 500 so Stripe keeps retrying until
    // it's fixed.
    console.error("Stripe webhook is not configured", error);
    return new Response("Webhook not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleCheckoutEvent(event);
  } catch (error) {
    // 500 makes Stripe redeliver; handling is idempotent.
    console.error(`Stripe webhook ${event.type} ${event.id} failed`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
