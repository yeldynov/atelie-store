import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/product-card";
import {
  getProduct,
  getProductSlugs,
  getRelatedProducts,
} from "@/lib/product-queries";
import {
  formatPrice,
  ONE_SIZE,
  productStock,
  stockLabel,
  stockStatus,
  type StockStatus,
} from "@/lib/products";
import { AddToBag, type SizeOption } from "./add-to-bag";

// Prerender known products at build time and re-read stock at most once a
// minute. Products added later render on first request; unknown slugs 404.
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.images[0].src] },
  };
}

const stockDot: Record<StockStatus, string> = {
  in_stock: "bg-ink",
  low_stock: "bg-error",
  out_of_stock: "bg-disabled",
};

export default async function ProductPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const status = productStock(product);
  const sizes: SizeOption[] = product.stock.map(({ size, quantity }) => ({
    label: size,
    quantity,
    status: stockStatus(quantity),
  }));
  const oneSize = sizes.length === 1 && sizes[0].label === ONE_SIZE;
  const related = await getRelatedProducts(product.slug);

  return (
    <>
      <div className="md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Gallery: swipe on mobile, stacked on desktop */}
        <ul
          aria-label={`${product.name} images`}
          className="scroll-row gap-px bg-paper md:flex-col md:overflow-visible"
        >
          {product.images.map((image, index) => (
            <li key={image.src} className="w-[86vw] shrink-0 md:w-full">
              <div className="media-editorial">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  preload={index === 0}
                  sizes="(min-width: 48rem) 60vw, 86vw"
                />
              </div>
            </li>
          ))}
        </ul>

        {/* Product information */}
        <div className="px-gutter pt-6 pb-12 md:sticky md:top-[calc(var(--header-height)+2.75rem+1px)] md:self-start md:px-10 md:pt-10 lg:px-16">
          <nav aria-label="Breadcrumb" className="mb-8 text-muted">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/" className="link-muted">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/collections/${product.categorySlug}`} className="link-muted">
                  {product.category}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink">
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col gap-3">
            <p className="text-label text-muted">{product.category}</p>
            <h1 className="text-title">{product.name}</h1>
            <p className="text-base">{formatPrice(product.price)}</p>
            <p className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${stockDot[status]}`}
              />
              <span className={status === "out_of_stock" ? "text-muted" : undefined}>
                {stockLabel[status]}
              </span>
              {product.badge && (
                <span className="ml-2 border border-line px-1.5 py-0.5 text-caption">
                  {product.badge}
                </span>
              )}
            </p>
          </div>

          <p className="mt-6 max-w-md text-sm text-muted">{product.description}</p>

          <div className="mt-8">
            <AddToBag slug={product.slug} productName={product.name} sizes={sizes} oneSize={oneSize} />
          </div>

          <div className="mt-6 border-b border-line">
            <Disclosure title="Details" open>
              <ul className="flex flex-col gap-1.5">
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </Disclosure>
            {!oneSize && (
              <Disclosure title="Size and fit" id="size-guide">
                <p>
                  Runs true to size. Available in {sizes.map((s) => s.label).join(", ")}.
                  If you are between sizes, we recommend taking the larger.
                </p>
              </Disclosure>
            )}
            <Disclosure title="Shipping and returns">
              <p>
                Complimentary express shipping on all orders, delivered in 2–4
                business days. Returns are free within 30 days of delivery.
              </p>
            </Disclosure>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section border-t border-line" aria-labelledby="related-title">
          <div className="container-bleed mb-8">
            <h2 id="related-title" className="text-title">
              You may also like
            </h2>
          </div>
          <ul className="grid-products border-y border-line">
            {related.map((item) => (
              <li key={item.slug}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Disclosure({
  title,
  id,
  open,
  children,
}: {
  title: string;
  id?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} open={open} className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-label [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-base font-light group-open:rotate-45 transition-transform">
          +
        </span>
      </summary>
      <div className="pb-5 text-muted">{children}</div>
    </details>
  );
}
