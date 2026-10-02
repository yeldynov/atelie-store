import type { Metadata } from "next";
import Link from "next/link";
import { BagLineItem } from "@/components/bag-line";
import { BagIcon } from "@/components/icons";
import { lineKey, type BagItem } from "@/lib/bag";
import { getBag, getCheckoutsInProgress } from "@/lib/bag-store";
import { getCategories } from "@/lib/product-queries";
import { formatPrice } from "@/lib/products";
import { getSession } from "@/lib/session";
import { CheckoutButton } from "./checkout-button";
import { ClearBagButton } from "./clear-bag-button";

export const metadata: Metadata = {
  title: "Shopping bag",
  robots: { index: false },
};

export default async function BagPage(props: PageProps<"/bag">) {
  const { checkout } = await props.searchParams;
  const [{ items, subtotal, count }, session, inProgress] = await Promise.all([
    getBag(),
    getSession(),
    getCheckoutsInProgress(),
  ]);
  const notice = typeof checkout === "string" ? notices[checkout] : undefined;

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
        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={`mt-5 flex flex-col gap-1 border px-4 py-3 ${notice.tone === "error" ? "border-error" : "border-ink"}`}
          >
            <p className={`font-medium ${notice.tone === "error" ? "text-error" : ""}`}>
              {notice.title}
            </p>
            <p className="text-muted">{notice.body}</p>
          </div>
        )}
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
            signedIn={session !== null}
            inProgress={
              inProgress[0] && {
                orderId: inProgress[0].id,
                minutesLeft: minutesUntil(inProgress[0].reservedUntil),
                matchesBag: sameLines(inProgress[0].items, items),
              }
            }
          />
        </div>
      )}
    </section>
  );
}

// Shown after returning from Stripe Checkout (?checkout=…).
const notices: Record<string, { title: string; body: string; tone: "info" | "error" }> = {
  cancelled: {
    title: "Checkout cancelled",
    body: "No payment was taken, and your bag is just as you left it.",
    tone: "info",
  },
  expired: {
    title: "Your checkout expired",
    body: "No payment was taken. Your items were held for 30 minutes; check out again when you're ready.",
    tone: "info",
  },
  error: {
    title: "We couldn't reach the payment page",
    body: "No payment was taken. Please try checking out again.",
    tone: "error",
  },
};

type CheckoutInProgress = {
  orderId: string;
  minutesLeft: number;
  // False when the bag changed after checkout started.
  matchesBag: boolean;
};

// Whole minutes left on a hold, at least 1. Evaluated once per request.
function minutesUntil(date: Date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000));
}

function sameLines(
  held: { productSlug: string; size: string; quantity: number }[],
  items: BagItem[],
) {
  const heldKeys = new Map(held.map((h) => [lineKey(h.productSlug, h.size), h.quantity]));
  return (
    heldKeys.size === items.length &&
    items.every((item) => heldKeys.get(lineKey(item.slug, item.size)) === item.quantity)
  );
}

function OrderSummary({
  subtotal,
  count,
  hasIssues,
  signedIn,
  inProgress,
}: {
  subtotal: number;
  count: number;
  hasIssues: boolean;
  signedIn: boolean;
  inProgress?: CheckoutInProgress;
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
        <div className="flex justify-between gap-4 border-t border-line pt-3 font-medium">
          <dt>Total</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
      </dl>
      {hasIssues && (
        <p role="alert" className="text-error">
          Some items changed since you added them. The subtotal only counts
          what is in stock.
        </p>
      )}
      {!signedIn ? (
        <div className="flex flex-col gap-2">
          <Link href="/sign-in?next=/bag" className="btn btn-primary btn-block">
            Sign in to check out
          </Link>
          <p className="text-center text-muted">
            New to Atelier?{" "}
            <Link href="/sign-up?next=/bag" className="link">
              Create an account
            </Link>
          </p>
        </div>
      ) : inProgress ? (
        <CheckoutInProgressPanel {...inProgress} hasIssues={hasIssues} />
      ) : (
        <CheckoutButton disabled={hasIssues} />
      )}
      <p className="text-center text-muted">
        You&apos;ll pay securely with Stripe and add your shipping address on the
        next step.
      </p>
      <Link href="/new" className="link self-center">
        Continue shopping
      </Link>
    </aside>
  );
}

// The customer went back from Stripe without finishing. Their items are still
// held; route handlers resume or cancel (plain <a> so nothing prefetches them).
function CheckoutInProgressPanel({
  orderId,
  minutesLeft,
  matchesBag,
  hasIssues,
}: CheckoutInProgress & { hasIssues: boolean }) {
  return (
    <div role="status" className="flex flex-col gap-4 border border-ink p-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium">Checkout in progress</p>
        <p className="text-muted">
          {matchesBag
            ? `Your items are held for about ${minutesLeft} more ${minutesLeft === 1 ? "minute" : "minutes"}.`
            : "Your bag changed since you started checking out. Check out again to pay for what's in it now."}
        </p>
      </div>
      {matchesBag ? (
        <a href={`/checkout/resume?order=${orderId}`} className="btn btn-primary btn-block">
          Continue to payment
        </a>
      ) : (
        <CheckoutButton disabled={hasIssues} label="Check out with updated bag" />
      )}
      <a href={`/checkout/cancel?order=${orderId}`} className="btn btn-secondary btn-block">
        Cancel checkout
      </a>
    </div>
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
