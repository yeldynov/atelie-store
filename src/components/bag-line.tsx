"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import {
  removeFromBag,
  updateQuantity,
  type BagActionResult,
} from "@/app/bag/actions";
import { MAX_QUANTITY, type BagItem } from "@/lib/bag";
import { setBag } from "@/lib/bag-client";
import { formatPrice, ONE_SIZE, stockStatus } from "@/lib/products";
import { MinusIcon, PlusIcon } from "./icons";

// One bag line: quantity stepper and remove, on the bag page and in the
// header mini bag (compact). Both call server actions, which re-check stock;
// the result updates the header and the bag page re-renders.
export function BagLineItem({
  item,
  compact = false,
}: {
  item: BagItem;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shown immediately while the action runs; reverts if it fails.
  const [quantity, setOptimisticQuantity] = useOptimistic(item.effectiveQuantity);

  const unavailable = item.issue === "unavailable";
  const href = item.found ? `/products/${item.slug}` : undefined;
  const lowStock = !unavailable && stockStatus(item.available) === "low_stock";
  const atMax = quantity >= item.maxQuantity;

  function run(action: () => Promise<BagActionResult>, optimistic?: number) {
    setError(null);
    startTransition(async () => {
      if (optimistic !== undefined) setOptimisticQuantity(optimistic);
      const result = await action();
      if (result.ok) setBag(result.bag);
      else setError(result.error);
    });
  }

  const changeQuantity = (next: number) =>
    run(() => updateQuantity(item.slug, item.size, next), next);

  // One message at a time: action errors first, then stock changes, then hints.
  const notice = error
    ? { text: error, tone: "error" }
    : unavailable
      ? {
          text: item.found
            ? "Sold out. Remove it to continue."
            : "This item is no longer available. Remove it to continue.",
          tone: "error",
        }
      : item.issue === "reduced"
        ? {
            text: `Only ${item.available} left. We reduced your quantity from ${item.quantity}.`,
            tone: "error",
          }
        : atMax
          ? {
              text:
                item.maxQuantity === MAX_QUANTITY && item.available > MAX_QUANTITY
                  ? `Limit of ${MAX_QUANTITY} per item.`
                  : `That's all we have${item.size === ONE_SIZE ? "" : ` in size ${item.size}`}.`,
              tone: "muted",
            }
          : lowStock
            ? { text: `Only ${item.available} left.`, tone: "muted" }
            : null;

  const media = (
    <div className={`media-product ${unavailable ? "opacity-50" : ""}`}>
      {item.image && (
        <Image
          src={item.image.src}
          alt={item.image.alt}
          fill
          sizes={compact ? "4rem" : "(min-width: 48rem) 8rem, 6rem"}
        />
      )}
      {unavailable && !compact && (
        <span className="absolute top-2 left-2 bg-paper px-1.5 py-0.5 text-caption">
          Sold out
        </span>
      )}
    </div>
  );

  const Heading = compact ? "h3" : "h2";
  const stepButton = `flex ${compact ? "size-8" : "size-9"} items-center justify-center transition-colors hover:bg-subtle disabled:text-disabled disabled:hover:bg-transparent`;

  return (
    <article
      aria-busy={pending}
      aria-label={item.name}
      className={compact ? "flex gap-3 py-4" : "flex gap-4 py-6 md:gap-6"}
    >
      <div className={compact ? "w-16 shrink-0" : "w-24 shrink-0 md:w-32"}>
        {href ? (
          <Link href={href} tabIndex={-1} aria-hidden="true">
            {media}
          </Link>
        ) : (
          media
        )}
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${compact ? "gap-2" : "gap-4"}`}>
        <div className="flex justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Heading className={`font-medium ${unavailable ? "text-muted" : ""}`}>
              {href ? (
                <Link href={href} className="hover:underline hover:underline-offset-4">
                  {item.name}
                </Link>
              ) : (
                item.name
              )}
            </Heading>
            {item.size !== ONE_SIZE && <p className="text-muted">Size {item.size}</p>}
            {item.found && !compact && (
              <p className="text-muted">{formatPrice(item.unitPrice)} each</p>
            )}
          </div>
          {item.found && (
            <p
              className={`shrink-0 transition-opacity ${unavailable ? "text-muted line-through" : ""} ${pending ? "opacity-40" : ""}`}
            >
              {formatPrice(item.unitPrice * (unavailable ? item.quantity : quantity))}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {unavailable ? (
            <span />
          ) : (
            <div
              role="group"
              aria-label={`Quantity of ${item.name}`}
              className={`flex ${compact ? "h-8" : "h-9"} items-center border border-line`}
            >
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1 || pending}
                onClick={() => changeQuantity(quantity - 1)}
                className={stepButton}
              >
                <MinusIcon />
              </button>
              <output aria-live="polite" className="w-8 text-center tabular-nums">
                {quantity}
              </output>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={atMax || pending}
                onClick={() => changeQuantity(quantity + 1)}
                className={stepButton}
              >
                <PlusIcon />
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => removeFromBag(item.slug, item.size))}
            className="link text-muted disabled:opacity-40"
          >
            Remove
          </button>
        </div>

        {(notice || item.issue === "reduced") && (
          <div className="flex flex-col items-start gap-3">
            {notice && (
              <p
                role={notice.tone === "error" ? "alert" : undefined}
                className={notice.tone === "error" ? "text-error" : "text-muted"}
              >
                {notice.text}
              </p>
            )}
            {item.issue === "reduced" && !error && (
              <button
                type="button"
                disabled={pending}
                onClick={() => changeQuantity(item.effectiveQuantity)}
                className="btn btn-secondary btn-sm"
              >
                Keep {item.effectiveQuantity}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
