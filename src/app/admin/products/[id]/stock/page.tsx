import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, getHeldUnits } from "@/lib/admin-queries";
import { parseProductId } from "@/lib/admin-validation";
import { stockLabel, stockStatus } from "@/lib/products";
import { requireAdmin } from "@/lib/session";
import { AddSizeForm, StockRow } from "./stock-forms";

export const metadata: Metadata = {
  title: "Stock · Admin",
  robots: { index: false },
};

export default async function ProductStockPage(props: PageProps<"/admin/products/[id]/stock">) {
  const { id: rawId } = await props.params;
  await requireAdmin(`/admin/products/${encodeURIComponent(rawId)}/stock`);

  const id = parseProductId(rawId);
  const [product, held] = await Promise.all([
    id ? getAdminProduct(id) : undefined,
    id ? getHeldUnits(id) : new Map<string, number>(),
  ]);
  if (!product) notFound();

  const { created } = await props.searchParams;
  const units = product.stock.reduce((sum, row) => sum + row.quantity, 0);
  const status = stockStatus(units);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link href={`/admin/products/${product.id}`} className="link-muted self-start text-label">
        ← {product.name}
      </Link>

      <header className="flex flex-col gap-3 border-b border-ink pb-4">
        <h1 className="text-title">Stock</h1>
        <p className="text-muted">
          {product.name} ·{" "}
          <span className={status === "out_of_stock" ? "text-error" : undefined}>
            {stockLabel[status]}
          </span>
          {" · "}
          {units} {units === 1 ? "unit" : "units"} available
        </p>
        {created === "1" && (
          <p role="status" className="text-muted">
            Product created. It shows as sold out until you add stock.
          </p>
        )}
      </header>

      <section aria-labelledby="sizes-title" className="flex flex-col gap-4">
        <h2 id="sizes-title" className="text-label">
          Availability by size
        </h2>
        <p className="text-muted">
          Available units are what customers can buy now. Units held in checkout are already
          taken out and return automatically if the checkout isn&apos;t completed. Sizes show
          on the product page in this order.
        </p>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {product.stock.map((row, index) => (
            <StockRow
              key={row.id}
              isFirst={index === 0}
              isLast={index === product.stock.length - 1}
              isOnly={product.stock.length === 1}
              stockId={row.id}
              productId={product.id}
              size={row.size}
              quantity={row.quantity}
              held={held.get(row.size) ?? 0}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="add-size-title" className="flex flex-col gap-4">
        <h2 id="add-size-title" className="text-label">
          Add a size
        </h2>
        <AddSizeForm productId={product.id} />
      </section>
    </div>
  );
}
