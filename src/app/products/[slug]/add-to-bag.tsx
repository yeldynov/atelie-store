"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToBag } from "@/app/bag/actions";
import { setBag } from "@/lib/bag-client";
import type { StockStatus } from "@/lib/products";

export type SizeOption = {
  label: string;
  quantity: number;
  status: StockStatus;
};

type Props = {
  slug: string;
  productName: string;
  sizes: SizeOption[];
  oneSize: boolean;
};

// Size selection and the add-to-bag action. Stock shown here can be up to a
// minute old; the server action re-checks it and reports any shortfall.
export function AddToBag({ slug, productName, sizes, oneSize }: Props) {
  const available = sizes.filter((size) => size.status !== "out_of_stock");
  const soldOut = available.length === 0;

  const [selected, setSelected] = useState<string | null>(
    oneSize && !soldOut ? sizes[0].label : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedSize = sizes.find((size) => size.label === selected);

  function handleAdd() {
    if (!selectedSize) {
      setError(true);
      setMessage("Please select a size.");
      return;
    }
    const size = selectedSize.label;
    setMessage(null);
    setAdded(false);
    startTransition(async () => {
      const result = await addToBag(slug, size, 1);
      if (!result.ok) {
        setError(true);
        setMessage(result.error);
        return;
      }
      setBag(result.bag);
      setError(false);
      setAdded(true);
      setMessage(
        oneSize
          ? `${productName} added to your bag.`
          : `${productName}, size ${size}, added to your bag.`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {!oneSize && (
        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <legend className="text-label">Size</legend>
            <a href="#size-guide" className="link text-muted">
              Size guide
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const unavailable = size.status === "out_of_stock";
              const isSelected = size.label === selected;
              return (
                <button
                  key={size.label}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={isSelected}
                  aria-label={
                    unavailable ? `${size.label}, sold out` : size.label
                  }
                  onClick={() => {
                    setSelected(size.label);
                    setError(false);
                    setAdded(false);
                    setMessage(null);
                  }}
                  className={[
                    "flex h-11 min-w-14 items-center justify-center border px-3 transition-colors",
                    isSelected
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-paper hover:border-ink",
                    unavailable &&
                      "cursor-not-allowed text-disabled line-through hover:border-line",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
          {selectedSize?.status === "low_stock" && (
            <p className="text-muted">
              Only {selectedSize.quantity} left in size {selectedSize.label}.
            </p>
          )}
        </fieldset>
      )}

      {soldOut ? (
        <button type="button" className="btn btn-primary btn-block" disabled>
          Sold out
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleAdd}
          disabled={pending}
        >
          {pending ? "Adding…" : "Add to bag"}
        </button>
      )}

      <p
        role="status"
        aria-live="polite"
        className={error ? "text-error" : "text-ink"}
      >
        {message}
        {added && (
          <>
            {" "}
            <Link href="/bag" className="link">
              View bag
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
