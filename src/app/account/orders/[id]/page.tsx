import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DeliveryDetails,
  OrderLines,
  orderDateFormat,
  OrderStatusLabel,
  PaymentStatusLabel,
} from "@/components/order-summary";
import { formatOrderNumber, getOrderForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

const paymentNotes = {
  paid: null,
  processing:
    "Your bank is confirming the payment. Your items are reserved, and we'll email you once it clears.",
  failed:
    "Your bank declined the payment, so no money was taken and the items were released.",
  unpaid: null,
};

export default async function OrderPage(props: PageProps<"/account/orders/[id]">) {
  const { id } = await props.params;
  const { user } = await requireUser(`/account/orders/${encodeURIComponent(id)}`);

  // Scoped to the signed-in user: another customer's order is a 404.
  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const note = paymentNotes[order.paymentStatus];

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Link href="/account/orders" className="link-muted self-start text-label">
        ← All orders
      </Link>

      <header className="flex flex-col gap-3 border-b border-ink pb-4">
        <h1 className="text-title">Order {formatOrderNumber(order.id)}</h1>
        {note && <p className="text-muted">{note}</p>}
      </header>

      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-label">Order date</dt>
          <dd className="text-muted">
            <time dateTime={order.createdAt.toISOString()}>
              {orderDateFormat.format(order.createdAt)}
            </time>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label">Order status</dt>
          <dd className="text-muted">
            <OrderStatusLabel status={order.status} />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label">Payment</dt>
          <dd className="text-muted">
            <PaymentStatusLabel status={order.paymentStatus} />
          </dd>
        </div>
      </dl>

      {order.paymentStatus !== "failed" && (
        <DeliveryDetails order={order} fallbackEmail={user.email} showDate={false} />
      )}

      <OrderLines order={order} />
    </div>
  );
}
