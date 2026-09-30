"use client";

import { useState } from "react";
import type { StockStatus } from "@/lib/products";

export type SizeOption = {
  label: string;
  quantity: number;
  status: StockStatus;
};

type Props = {
  productName: string;
  sizes: SizeOption[];
  oneSize: boolean;
};

// Size selection and the add-to-bag action. The bag itself isn't built yet,
// so adding only confirms the selection on the page.
export function AddToBag({ productName, sizes, oneSize }: Props) {
  const available = sizes.filter((size) => size.status !== "out_of_stock");
  const soldOut = available.length === 0;

  const [selected, setSelected] = useState<string | null>(
    oneSize && !soldOut ? sizes[0].label : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const selectedSize = sizes.find((size) => size.label === selected);

  function handleAdd() {
    if (!selectedSize) {
      setError(true);
      setMessage("Please select a size.");
      return;
    }
    setError(false);
    setMessage(
      oneSize
        ? `${productName} added to your bag.`
        : `${productName}, size ${selectedSize.label}, added to your bag.`,
    );
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
        >
          Add to bag
        </button>
      )}

      <p
        role="status"
        aria-live="polite"
        className={error ? "text-error" : "text-ink"}
      >
        {message}
      </p>
    </div>
  );
}
