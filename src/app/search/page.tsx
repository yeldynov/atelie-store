import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { getCategories, searchProducts } from "@/lib/product-queries";

const MAX_QUERY_LENGTH = 100;

async function getQuery(props: PageProps<"/search">) {
  const { q } = await props.searchParams;
  const value = Array.isArray(q) ? q[0] : q;
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

export async function generateMetadata(
  props: PageProps<"/search">,
): Promise<Metadata> {
  const query = await getQuery(props);
  return {
    title: query ? `Search results for “${query}”` : "Search",
    robots: { index: false },
  };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const query = await getQuery(props);
  const [products, categories] = await Promise.all([
    searchProducts(query),
    query ? [] : getCategories(),
  ]);

  return (
    <section aria-labelledby="search-title">
      <div className="container-bleed flex flex-col gap-6 pt-6 pb-8 md:pt-10 md:pb-12">
        <nav aria-label="Breadcrumb" className="mb-5 text-muted">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="link-muted">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              Search
            </li>
          </ol>
        </nav>

        <h1 id="search-title" className="sr-only">
          Search
        </h1>
        <Form action="/search" role="search" className="flex items-center gap-2 border-b border-ink">
          <label htmlFor="search-input" className="sr-only">
            Search products
          </label>
          <input
            id="search-input"
            type="search"
            name="q"
            defaultValue={query}
            key={query}
            placeholder="What are you looking for?"
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="off"
            autoFocus={!query}
            className="min-w-0 flex-1 bg-transparent py-3 text-title placeholder:text-disabled focus:outline-none"
          />
          <button type="submit" className="btn-icon -mr-2.5 shrink-0" aria-label="Search">
            <SearchIcon />
          </button>
        </Form>

        {query && (
          <div className="flex items-end justify-between gap-4">
            <p className="text-label">Results for “{query}”</p>
            <p className="text-muted" aria-live="polite">
              {products.length} {products.length === 1 ? "item" : "items"}
            </p>
          </div>
        )}
      </div>

      {!query ? (
        <div className="flex flex-col gap-4 border-t border-line px-gutter py-12 md:py-16">
          <p className="text-label text-muted">Browse collections</p>
          <ul className="flex flex-wrap gap-3">
            {[{ name: "New in", slug: "" }, ...categories].map((category) => (
              <li key={category.slug}>
                <Link
                  href={category.slug ? `/collections/${category.slug}` : "/new"}
                  className="btn btn-secondary btn-sm"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : products.length > 0 ? (
        <ul className="grid-products border-y border-line">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-5 border-t border-line px-gutter py-20 text-center">
          <p className="text-muted">
            Nothing matches “{query}”. Try a different word, or browse the
            latest pieces.
          </p>
          <Link href="/new" className="btn btn-secondary">
            Shop new arrivals
          </Link>
        </div>
      )}
    </section>
  );
}
