import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderBySessionForUser } from "@/lib/orders";
import { Spinner } from "@/components/form-field";
import { DeliveryDetails, OrderLines } from "@/components/order-summary";
import { requireUser } from "@/lib/session";
import { AwaitConfirmation, ClearPurchasedItems } from "./order-status";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false },
};

// Stripe's success_url. Reaching it proves nothing about payment: the page
// only displays the order status the webhook stored, and waits for it.
export default async function CheckoutSuccessPage(
  props: PageProps<"/checkout/success">,
) {
  const { session_id } = await props.searchParams;
  const sessionId = typeof session_id === "string" ? session_id : "";
  const { user } = await requireUser(
    `/checkout/success?session_id=${encodeURIComponent(sessionId)}`,
  );

  const order = sessionId
    ? await getOrderBySessionForUser(sessionId, user.id)
    : undefined;
  if (!order) notFound();

  const state =
    order.status === "confirmed"
      ? "paid"
      : order.status === "cancelled"
        ? "cancelled"
        : order.paymentStatus === "processing"
          ? "processing"
          : "confirming";

  const copy = {
    paid: {
      title: "Thank you for your order",
      body: `Your payment was received. We've emailed a receipt to ${order.email ?? user.email}.`,
    },
    processing: {
      title: "Your payment is processing",
      body: "Your bank is confirming the payment. Your items are reserved, and we'll email you once it clears.",
    },
    confirming: {
      title: "Confirming your payment…",
      body: "This usually takes a few seconds. Please keep this page open.",
    },
    cancelled: {
      title:
        order.cancelReason === "payment_failed"
          ? "Your payment didn't go through"
          : "This checkout was not completed",
      body:
        order.cancelReason === "payment_failed"
          ? "Your bank declined the payment, so no money was taken and the items were released. You can add them to your bag again and pay another way."
          : "No payment was taken. Your bag is still saved if you'd like to check out again.",
    },
  }[state];

  return (
    <section aria-labelledby="order-title" className="container-bleed pb-16 pt-6 md:pb-24 md:pt-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-ink pb-4">
          <h1 id="order-title" className="text-title">
            {copy.title}
          </h1>
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-muted">
            {state === "confirming" && <Spinner />}
            {copy.body}
          </p>
          {state === "confirming" && <AwaitConfirmation />}
        </header>

        {(state === "paid" || state === "processing") && (
          <ClearPurchasedItems sessionId={sessionId} />
        )}

        {(state === "paid" || state === "processing") && (
          <DeliveryDetails order={order} fallbackEmail={user.email} />
        )}

        <OrderLines order={order} />

        <div className="flex flex-wrap gap-3">
          {state === "cancelled" && order.cancelReason !== "payment_failed" ? (
            <Link href="/bag" className="btn btn-primary">
              Return to bag
            </Link>
          ) : (
            <Link href="/new" className="btn btn-primary">
              Continue shopping
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
