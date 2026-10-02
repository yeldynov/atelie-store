"use client";

import { useActionState } from "react";
import { ConfirmButton } from "../confirm-button";
import { deleteProduct, type DeleteProductState } from "./actions";

export function DeleteProduct({
  productId,
  productName,
  orderCount,
}: {
  productId: number;
  productName: string;
  orderCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    deleteProduct.bind(null, productId),
    {} as DeleteProductState,
  );
  const ordered = orderCount > 0;

  return (
    <section aria-labelledby="delete-title" className="flex flex-col gap-4">
      <h2 id="delete-title" className="border-b border-ink pb-3 text-label">
        Delete product
      </h2>
      <p className="text-muted">
        {ordered
          ? `${productName} appears in ${orderCount} order ${orderCount === 1 ? "line" : "lines"}, so it's kept for order history. Set its stock to 0 to stop selling it.`
          : "Removes the product, its sizes and stock from the store. Customers who have it in their bag will see it as no longer available. This can't be undone."}
      </p>
      <form action={formAction} aria-busy={pending} className="flex flex-col items-start gap-3">
        <ConfirmButton
          key={state.error ?? "idle"}
          label="Delete product"
          confirmLabel={`Delete ${productName}`}
          pendingLabel="Deleting…"
          pending={pending}
          disabled={ordered}
          className="btn btn-secondary btn-sm"
        />
        {state.error && (
          <p role="alert" className="text-error">
            {state.error}
          </p>
        )}
      </form>
    </section>
  );
}
