import "server-only";

import Stripe from "stripe";

// Created on first use rather than at import, so pages that only import
// checkout actions still build without Stripe keys set.
let client: Stripe | undefined;

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, {
      apiVersion: "2026-08-26.dahlia",
      // Retries reuse the request's idempotency key, so they can't create a
      // second Checkout Session.
      maxNetworkRetries: 2,
    });
  }
  return client;
}

export function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

// Absolute base for Stripe's success and cancel URLs.
export function appUrl(path: string) {
  const base = process.env.BETTER_AUTH_URL;
  if (!base) throw new Error("BETTER_AUTH_URL is not set");
  return new URL(path, base).toString();
}
