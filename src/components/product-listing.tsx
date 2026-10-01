import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/products";

// Listing page body: breadcrumb, title with item count, edge-to-edge grid.
export function ProductListing({
  eyebrow,
  title,
  products,
}: {
  eyebrow: string;
  title: string;
  products: Product[];
}) {
  return (
    <section aria-labelledby="listing-title">
      <div className="container-bleed flex flex-col gap-3 pt-6 pb-8 md:pt-10 md:pb-12">
        <nav aria-label="Breadcrumb" className="mb-5 text-muted">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="link-muted">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {title}
            </li>
          </ol>
        </nav>
        <p className="text-label text-muted">{eyebrow}</p>
        <div className="flex items-end justify-between gap-4">
          <h1 id="listing-title" className="text-title">
            {title}
          </h1>
          <p className="text-muted">
            {products.length} {products.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {products.length > 0 ? (
        <ul className="grid-products border-y border-line">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-5 border-t border-line px-gutter py-20 text-center">
          <p className="text-muted">New pieces are on their way. Check back soon.</p>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>
      )}
    </section>
  );
}
