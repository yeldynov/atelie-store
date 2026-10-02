import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  DeliveryDetails,
  OrderLines,
  orderDateFormat,
  OrderStatusLabel,
  PaymentStatusLabel,
} from "@/components/order-summary";
import { getAdminOrder } from "@/lib/admin-queries";
import { formatOrderNumber } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order · Admin",
  robots: { index: false },
};

const cancelReasons = {
  expired: "Checkout expired",
  payment_failed: "Payment declined",
  session_create_failed: "Checkout could not start",
  checkout_cancelled: "Customer left checkout",
};

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

// Read-only: payment state only changes through Stripe webhooks.
export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/orders/${encodeURIComponent(id)}`);

  const order = await getAdminOrder(id);
  if (!order) notFound();

  const facts: { label: string; value: ReactNode }[] = [
    {
      label: "Placed",
      value: (
        <time dateTime={order.createdAt.toISOString()}>
          {orderDateFormat.format(order.createdAt)}
        </time>
      ),
    },
    { label: "Status", value: <OrderStatusLabel status={order.status} /> },
    { label: "Payment", value: <PaymentStatusLabel status={order.paymentStatus} /> },
    { label: "Customer", value: `${order.user.name} · ${order.user.email}` },
  ];
  if (order.paidAt) {
    facts.push({ label: "Paid", value: `${dateTimeFormat.format(order.paidAt)} UTC` });
  }
  if (order.cancelReason && order.cancelledAt) {
    facts.push({
      label: "Cancelled",
      value: `${cancelReasons[order.cancelReason]} · ${dateTimeFormat.format(order.cancelledAt)} UTC`,
    });
  }
  if (order.status === "pending") {
    facts.push({
      label: "Stock held until",
      value: `${dateTimeFormat.format(order.reservedUntil)} UTC`,
    });
  }
  if (order.stripePaymentIntentId) {
    facts.push({ label: "Stripe payment", value: order.stripePaymentIntentId });
  } else if (order.stripeCheckoutSessionId) {
    facts.push({ label: "Stripe session", value: order.stripeCheckoutSessionId });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Link href="/admin/orders" className="link-muted self-start text-label">
        ← All orders
      </Link>

      <header className="border-b border-ink pb-4">
        <h1 className="text-title">Order {formatOrderNumber(order.id)}</h1>
      </header>

      <dl className="grid gap-5 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-label">{fact.label}</dt>
            <dd className="break-all text-muted">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {(order.paymentStatus === "paid" || order.paymentStatus === "processing") && (
        <DeliveryDetails order={order} fallbackEmail={order.user.email} showDate={false} />
      )}

      <OrderLines order={order} />
    </div>
  );
}
