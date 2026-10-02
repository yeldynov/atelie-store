import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminCategoryOptions,
  getAdminProduct,
  getProductOrderCount,
} from "@/lib/admin-queries";
import { formatPriceInput, parseProductId } from "@/lib/admin-validation";
import { ONE_SIZE, stockLabel, stockStatus } from "@/lib/products";
import { requireAdmin } from "@/lib/session";
import { updateProduct } from "../actions";
import { DeleteProduct } from "../delete-product";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Edit product · Admin",
  robots: { index: false },
};

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id: rawId } = await props.params;
  await requireAdmin(`/admin/products/${encodeURIComponent(rawId)}`);

  const id = parseProductId(rawId);
  const [product, categories, orderCount] = await Promise.all([
    id ? getAdminProduct(id) : undefined,
    getAdminCategoryOptions(),
    id ? getProductOrderCount(id) : 0,
  ]);
  if (!product) notFound();

  const units = product.stock.reduce((sum, row) => sum + row.quantity, 0);
  const status = stockStatus(units);
  const sizes = product.stock.filter((row) => row.size !== ONE_SIZE).length;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link href="/admin/products" className="link-muted self-start text-label">
        ← All products
      </Link>
      <header className="flex flex-col gap-3 border-b border-ink pb-4">
        <h1 className="text-title">{product.name}</h1>
        <p className="text-muted">
          <span className={status === "out_of_stock" ? "text-error" : undefined}>
            {stockLabel[status]}
          </span>
          {" · "}
          {units} {units === 1 ? "unit" : "units"}
          {sizes > 0 && ` across ${sizes} ${sizes === 1 ? "size" : "sizes"}`}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/admin/products/${product.id}/stock`} className="link">
            Manage stock
          </Link>
          <Link href={`/products/${product.slug}`} className="link">
            View in store
          </Link>
        </div>
      </header>

      <ProductForm
        mode="update"
        action={updateProduct.bind(null, product.id)}
        categories={categories}
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: String(product.categoryId),
          price: formatPriceInput(product.priceCents),
          badge: product.badge ?? "",
          description: product.description,
          details: product.details.join("\n"),
          images: product.images,
          sizes: "",
        }}
      />

      <DeleteProduct productId={product.id} productName={product.name} orderCount={orderCount} />
    </div>
  );
}
