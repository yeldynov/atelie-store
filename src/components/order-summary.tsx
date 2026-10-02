import Image from "next/image";
import Link from "next/link";
import {
  formatOrderNumber,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { formatPrice, ONE_SIZE } from "@/lib/products";

// Order details shared by the checkout confirmation and the account order page.

export const orderDateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

const paymentLabels: Record<PaymentStatus, string> = {
  paid: "Paid",
  processing: "Processing",
  failed: "Payment failed",
  unpaid: "Unpaid",
};

export function PaymentStatusLabel({ status }: { status: PaymentStatus }) {
  return (
    <span className={status === "failed" ? "text-error" : undefined}>
      {paymentLabels[status]}
    </span>
  );
}

const orderStatusLabels: Record<OrderStatus, string> = {
  confirmed: "Confirmed",
  pending: "Awaiting payment",
  cancelled: "Cancelled",
};

export function OrderStatusLabel({ status }: { status: OrderStatus }) {
  return <>{orderStatusLabels[status]}</>;
}

export function DeliveryDetails({
  order,
  fallbackEmail,
  showDate = true,
}: {
  order: Order;
  fallbackEmail: string;
  showDate?: boolean;
}) {
  const address = order.shipping?.address;
  return (
    <dl className="grid gap-5 sm:grid-cols-3">
      {showDate && (
        <div className="flex flex-col gap-1">
          <dt className="text-label">Order date</dt>
          <dd className="text-muted">
            <time dateTime={order.createdAt.toISOString()}>{orderDateFormat.format(order.createdAt)}</time>
          </dd>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <dt className="text-label">Receipt sent to</dt>
        <dd className="break-all text-muted">{order.email ?? fallbackEmail}</dd>
      </div>
      {address && (
        <div className="flex flex-col gap-1">
          <dt className="text-label">Shipping to</dt>
          <dd className="text-muted">
            <address className="not-italic">
              {[
                order.shipping?.name,
                address.line1,
                address.line2,
                [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
                address.country,
              ]
                .filter(Boolean)
                .map((part) => (
                  <span key={part} className="block">
                    {part}
                  </span>
                ))}
            </address>
          </dd>
        </div>
      )}
    </dl>
  );
}

export function OrderLines({ order }: { order: Order }) {
  return (
    <section aria-labelledby="lines-title" className="flex flex-col gap-4">
      <h2 id="lines-title" className="flex justify-between gap-4 text-label">
        <span>Order summary</span>
        <span className="text-muted">{formatOrderNumber(order.id)}</span>
      </h2>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4">
            <div className="w-20 shrink-0">
              <div className="media-product">
                {item.image && (
                  <Image src={item.image.src} alt={item.image.alt} fill sizes="5rem" />
                )}
              </div>
            </div>
            <div className="flex flex-1 justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="hover:underline hover:underline-offset-4"
                >
                  {item.productName}
                </Link>
                <p className="text-muted">
                  {item.size !== ONE_SIZE && <>Size {item.size} · </>}Qty {item.quantity}
                </p>
                <p className="text-muted">{formatPrice(item.unitPriceCents)} each</p>
              </div>
              <p>{formatPrice(item.unitPriceCents * item.quantity)}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-3">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd>{formatPrice(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted">
          <dt>Shipping</dt>
          <dd>{order.shippingCents === 0 ? "Complimentary" : formatPrice(order.shippingCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-ink pt-3">
          <dt>Total</dt>
          <dd>{formatPrice(order.totalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}
