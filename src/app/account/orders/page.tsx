import type { Metadata } from "next";
import Link from "next/link";
import { orderDateFormat, PaymentStatusLabel } from "@/components/order-summary";
import { formatOrderNumber, getOrdersForUser } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false },
};

export default async function OrdersPage() {
  const { user } = await requireUser("/account/orders");
  const orders = await getOrdersForUser(user.id);

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-title">Orders</h1>
        <p className="text-muted">
          {orders.length === 0
            ? "You haven't placed any orders yet."
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"}, newest first.`}
        </p>
      </header>

      {orders.length === 0 ? (
        <div>
          <Link href="/new" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-ink">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li
                key={order.id}
                className="group relative flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-label">
                    {/* Covers the whole row, so the row is one link target. */}
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline"
                    >
                      Order {formatOrderNumber(order.id)}
                    </Link>
                  </h2>
                  <p className="text-muted">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </p>
                </div>

                <dl className="grid grid-cols-3 gap-4 sm:flex sm:gap-10">
                  <div className="flex flex-col gap-1">
                    <dt className="text-muted">Date</dt>
                    <dd>
                      <time dateTime={order.createdAt.toISOString()}>
                        {orderDateFormat.format(order.createdAt)}
                      </time>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:w-28">
                    <dt className="text-muted">Payment</dt>
                    <dd>
                      <PaymentStatusLabel status={order.paymentStatus} />
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 text-right sm:w-20">
                    <dt className="text-muted">Total</dt>
                    <dd>{formatPrice(order.totalCents)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
