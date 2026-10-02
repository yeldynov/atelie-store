import type { Metadata } from "next";
import Link from "next/link";
import { BagLineItem } from "@/components/bag-line";
import { BagIcon } from "@/components/icons";
import { getBag } from "@/lib/bag-store";
import { getCategories } from "@/lib/product-queries";
import { formatPrice } from "@/lib/products";
import { ClearBagButton } from "./clear-bag-button";

export const metadata: Metadata = {
  title: "Shopping bag",
  robots: { index: false },
};

export default async function BagPage() {
  const { items, subtotal, count } = await getBag();

  return (
    <section aria-labelledby="bag-title">
      <div className="container-bleed pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-5 text-muted">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="link-muted">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              Shopping bag
            </li>
          </ol>
        </nav>
        <div className="flex items-end justify-between gap-4 border-b border-ink pb-4">
          <h1 id="bag-title" className="text-title">
            Shopping bag
          </h1>
          {items.length > 0 && (
            <p className="text-muted" aria-live="polite">
              {count} {count === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      </div>

      {items.length === 0 ? <EmptyBag /> : (
        <div className="container-bleed grid gap-10 pb-16 md:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] md:gap-16 md:pb-24 lg:gap-24">
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col divide-y divide-line border-b border-line">
              {items.map((item) => (
                <li key={`${item.slug}/${item.size}`}>
                  <BagLineItem item={item} />
                </li>
              ))}
            </ul>
            <ClearBagButton />
          </div>

          <OrderSummary
            subtotal={subtotal}
            count={count}
            hasIssues={items.some((item) => item.issue)}
          />
        </div>
      )}
    </section>
  );
}

function OrderSummary({
  subtotal,
  count,
  hasIssues,
}: {
  subtotal: number;
  count: number;
  hasIssues: boolean;
}) {
  return (
    <aside
      aria-labelledby="summary-title"
      className="flex flex-col gap-5 md:sticky md:top-[calc(var(--header-height)+2.75rem+1px)] md:self-start md:pt-6"
    >
      <h2 id="summary-title" className="border-b border-ink pb-3 text-label">
        Order summary
      </h2>
      <dl className="flex flex-col gap-3">
        <div className="flex justify-between gap-4">
          <dt>
            Subtotal{" "}
            <span className="text-muted">
              ({count} {count === 1 ? "item" : "items"})
            </span>
          </dt>
          <dd aria-live="polite">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted">
          <dt>Shipping</dt>
          <dd>Complimentary</dd>
        </div>
      </dl>
      {hasIssues && (
        <p role="alert" className="text-error">
          Some items changed since you added them. The subtotal only counts
          what is in stock.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-primary btn-block" disabled>
          Checkout
        </button>
        <p className="text-center text-muted">Checkout is coming soon.</p>
      </div>
      <Link href="/new" className="link self-center">
        Continue shopping
      </Link>
    </aside>
  );
}

async function EmptyBag() {
  const categories = await getCategories();
  return (
    <div className="flex flex-col items-center gap-6 px-gutter py-20 text-center md:py-28">
      <BagIcon width={32} height={32} className="text-muted" />
      <div className="flex flex-col gap-2">
        <p className="text-base">Your bag is empty.</p>
        <p className="text-muted">Pieces you add will be saved here.</p>
      </div>
      <ul className="flex flex-wrap justify-center gap-3">
        {[{ name: "New in", slug: "" }, ...categories].map((category) => (
          <li key={category.slug}>
            <Link
              href={category.slug ? `/collections/${category.slug}` : "/new"}
              className="btn btn-secondary btn-sm"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
