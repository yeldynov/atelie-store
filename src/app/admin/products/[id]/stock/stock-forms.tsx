"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/form-field";
import { PRODUCT_LIMITS } from "@/lib/admin-validation";
import { ONE_SIZE, stockLabel, stockStatus } from "@/lib/products";
import { ConfirmButton } from "../../../confirm-button";
import {
  addSize,
  moveSize,
  removeSize,
  type StockFormState,
  updateStock,
} from "./actions";

type StockRowProps = {
  stockId: number;
  productId: number;
  size: string;
  quantity: number;
  held: number;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
};

// One size: units available to sell, units held by open checkouts, and a
// form to set the available units. `expected` is the value this page showed,
// so a save never overwrites a change made since (see updateStock).
export function StockRow({
  stockId,
  productId,
  size,
  quantity,
  held,
  isFirst,
  isLast,
  isOnly,
}: StockRowProps) {
  const [state, formAction, pending] = useActionState(updateStock, {} as StockFormState);
  const status = stockStatus(quantity);
  const label = size === ONE_SIZE ? ONE_SIZE : `Size ${size}`;
  const inputId = `stock-${stockId}`;
  const messageId = `${inputId}-message`;

  return (
    <li className="grid gap-x-6 gap-y-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{label}</p>
        <p className="text-muted">
          <span className={status === "out_of_stock" ? "text-error" : undefined}>
            {stockLabel[status]}
          </span>
          {" · "}
          {quantity} available
          {held > 0 && ` · ${held} held in checkout`}
        </p>
        <SizeActions
          stockId={stockId}
          productId={productId}
          label={label}
          quantity={quantity}
          held={held}
          isFirst={isFirst}
          isLast={isLast}
          isOnly={isOnly}
        />
      </div>

      <form action={formAction} aria-busy={pending} className="flex flex-col gap-2 sm:items-end">
        <input type="hidden" name="stockId" value={stockId} />
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="expected" value={quantity} />
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-label">
              Available units
              <span className="sr-only">, {label}</span>
            </label>
            {/* Keyed by the stored value so a refreshed quantity replaces the input. */}
            <input
              key={quantity}
              id={inputId}
              name="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              max={PRODUCT_LIMITS.quantity}
              step={1}
              required
              defaultValue={quantity}
              readOnly={pending}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? messageId : undefined}
              className="field-input w-28 tabular-nums"
            />
          </div>
          <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
            {pending && <Spinner />}
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        <p
          id={messageId}
          role={state.error ? "alert" : "status"}
          className={state.error ? "text-error sm:text-right" : "text-muted sm:text-right"}
        >
          {state.error ?? (state.status === "saved" && !pending ? "Saved." : "")}
        </p>
      </form>
    </li>
  );
}

export function AddSizeForm({ productId }: { productId: number }) {
  const [state, formAction, pending] = useActionState(
    addSize.bind(null, productId),
    {} as StockFormState,
  );

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
          <label htmlFor="new-size" className="text-label">
            New size
          </label>
          <input
            id="new-size"
            name="size"
            required
            maxLength={PRODUCT_LIMITS.size}
            autoComplete="off"
            aria-invalid={state.error ? true : undefined}
            aria-describedby="new-size-message"
            className="field-input"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
          {pending && <Spinner />}
          {pending ? "Adding…" : "Add size"}
        </button>
      </div>
      <p
        id="new-size-message"
        role={state.error ? "alert" : "status"}
        className={state.error ? "text-error" : "text-muted"}
      >
        {state.error ??
          (state.status === "saved" && !pending
            ? "Size added with no stock."
            : "Added after the existing sizes, with no stock.")}
      </p>
    </form>
  );
}

// Reorder and remove for one size. Each button posts its own small form.
function SizeActions({
  stockId,
  productId,
  label,
  quantity,
  held,
  isFirst,
  isLast,
  isOnly,
}: {
  stockId: number;
  productId: number;
  label: string;
  quantity: number;
  held: number;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
}) {
  const [moveState, moveAction, moving] = useActionState(moveSize, {} as StockFormState);
  const [removeState, removeAction, removing] = useActionState(removeSize, {} as StockFormState);
  const error = removeState.error ?? moveState.error;
  const blocked = isOnly
    ? "The only size can't be removed."
    : held > 0
      ? "Can't be removed while held in checkout."
      : undefined;

  const ids = (
    <>
      <input type="hidden" name="stockId" value={stockId} />
      <input type="hidden" name="productId" value={productId} />
    </>
  );
  const moveButton = "link text-muted disabled:no-underline disabled:opacity-40";

  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <form action={moveAction} aria-busy={moving} className="flex gap-4">
          {ids}
          <button
            type="submit"
            name="direction"
            value="up"
            disabled={isFirst || moving}
            aria-label={`Move ${label} up`}
            className={moveButton}
          >
            Move up
          </button>
          <button
            type="submit"
            name="direction"
            value="down"
            disabled={isLast || moving}
            aria-label={`Move ${label} down`}
            className={moveButton}
          >
            Move down
          </button>
        </form>
        <form action={removeAction} aria-busy={removing}>
          {ids}
          <input type="hidden" name="expected" value={quantity} />
          <ConfirmButton
            key={removeState.error ?? "idle"}
            label="Remove"
            confirmLabel={`Remove ${label}`}
            pendingLabel="Removing…"
            pending={removing}
            disabled={blocked !== undefined}
          />
        </form>
      </div>
      {(error || blocked) && (
        <p role={error ? "alert" : undefined} className={error ? "text-error" : "text-muted"}>
          {error ?? blocked}
        </p>
      )}
    </div>
  );
}
