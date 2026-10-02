import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAdminCategoryOptions, getAdminProducts } from "@/lib/admin-queries";
import { formatPrice, stockLabel, stockStatus } from "@/lib/products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Products · Admin",
  robots: { index: false },
};

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  await requireAdmin("/admin/products");

  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const categoryParam = typeof params.category === "string" ? Number(params.category) : NaN;
  const categoryId = Number.isInteger(categoryParam) && categoryParam > 0 ? categoryParam : undefined;
  const filtered = Boolean(q || categoryId);
  const deleted = params.deleted === "1";

  const [rows, categories] = await Promise.all([
    getAdminProducts({ q, categoryId }),
    getAdminCategoryOptions(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-title">Products</h1>
          <p className="text-muted">
            {rows.length} {rows.length === 1 ? "product" : "products"}
            {filtered ? " matching your filters" : ""}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">
          New product
        </Link>
      </header>

      {deleted && (
        <p role="status" className="text-muted">
          Product deleted.
        </p>
      )}

      <form
        role="search"
        aria-label="Filter products"
        className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-q" className="text-label">
            Name
          </label>
          <input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by name"
            className="field-input"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-category" className="text-label">
            Category
          </label>
          <select
            id="filter-category"
            name="category"
            defaultValue={categoryId ?? ""}
            className="field-input"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
          {filtered && (
            <Link href="/admin/products" className="link-muted text-label">
              Clear
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="border-y border-line py-6 text-muted">
          {filtered ? "No products match these filters." : "No products yet."}
        </p>
      ) : (
        // relative: keeps the absolutely positioned sr-only header inside the scroll box.
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-2xl text-left">
            <thead className="border-b border-ink">
              <tr>
                <th scope="col" className="py-3 pr-4 text-label">Product</th>
                <th scope="col" className="py-3 pr-4 text-label">Category</th>
                <th scope="col" className="py-3 pr-4 text-right text-label">Price</th>
                <th scope="col" className="py-3 pr-4 text-right text-label">Units</th>
                <th scope="col" className="py-3 pr-4 text-label">Availability</th>
                <th scope="col" className="py-3 text-label">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((product) => {
                const status = stockStatus(product.units);
                const image = product.images[0];
                return (
                  <tr key={product.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 shrink-0">
                          <div className="media-product">
                            {image && <Image src={image.src} alt="" fill sizes="3rem" />}
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-medium hover:underline hover:underline-offset-4"
                          >
                            {product.name}
                          </Link>
                          <span className="truncate text-muted">{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{product.category}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatPrice(product.priceCents)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{product.units}</td>
                    <td className={`py-3 pr-4 ${status === "out_of_stock" ? "text-error" : ""}`}>
                      {stockLabel[status]}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/products/${product.id}/stock`}
                        aria-label={`Stock for ${product.name}`}
                        className="link"
                      >
                        Stock
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
