import type { Metadata } from "next";
import Link from "next/link";
import {
  orderDateFormat,
  OrderStatusLabel,
  PaymentStatusLabel,
} from "@/components/order-summary";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  type AdminOrderStatus,
  getAdminOrders,
} from "@/lib/admin-queries";
import { formatOrderNumber } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders · Admin",
  robots: { index: false },
};

const filters: { label: string; status?: AdminOrderStatus }[] = [
  { label: "All" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Pending", status: "pending" },
  { label: "Cancelled", status: "cancelled" },
];

const isStatus = (value: unknown): value is AdminOrderStatus =>
  value === "pending" || value === "confirmed" || value === "cancelled";

function ordersHref(status: AdminOrderStatus | undefined, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin("/admin/orders");

  const params = await props.searchParams;
  const status = isStatus(params.status) ? params.status : undefined;
  const pageParam = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { rows, total } = await getAdminOrders({ status, page });
  const pages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-title">Orders</h1>
        <p className="text-muted">
          {total} {total === 1 ? "order" : "orders"}, newest first. Pending orders are checkouts
          still in progress; cancelled ones were abandoned, expired or declined.
        </p>
      </header>

      <nav aria-label="Filter by status">
        <ul className="scroll-row h-11 items-center border-b border-line">
          {filters.map((filter) => (
            <li key={filter.label}>
              <Link
                href={ordersHref(filter.status)}
                aria-current={filter.status === status ? "page" : undefined}
                className="link-nav text-label"
              >
                {filter.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <p className="border-y border-line py-6 text-muted">No orders here yet.</p>
      ) : (
        // relative: keeps the absolutely positioned sr-only header inside the scroll box.
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-3xl text-left">
            <thead className="border-b border-ink">
              <tr>
                <th scope="col" className="py-3 pr-4 text-label">Order</th>
                <th scope="col" className="py-3 pr-4 text-label">Date</th>
                <th scope="col" className="py-3 pr-4 text-label">Customer</th>
                <th scope="col" className="py-3 pr-4 text-label">Status</th>
                <th scope="col" className="py-3 pr-4 text-label">Payment</th>
                <th scope="col" className="py-3 text-right text-label">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium hover:underline hover:underline-offset-4"
                    >
                      {formatOrderNumber(order.id)}
                    </Link>
                    <span className="block text-muted">
                      {order.units} {order.units === 1 ? "item" : "items"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <time dateTime={order.createdAt.toISOString()}>
                      {orderDateFormat.format(order.createdAt)}
                    </time>
                  </td>
                  <td className="max-w-56 truncate py-3 pr-4">{order.customerEmail}</td>
                  <td className="py-3 pr-4">
                    <OrderStatusLabel status={order.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <PaymentStatusLabel status={order.paymentStatus} />
                  </td>
                  <td className="py-3 text-right tabular-nums">{formatPrice(order.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={ordersHref(status, page - 1)} className="link text-label">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <p className="text-muted">
            Page {page} of {pages}
          </p>
          {page < pages ? (
            <Link href={ordersHref(status, page + 1)} className="link text-label">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
