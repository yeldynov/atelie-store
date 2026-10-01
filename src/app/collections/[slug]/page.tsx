import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/product-listing";
import { getCategory, getCategorySlugs } from "@/lib/product-queries";

// One collection per category. Prerender known categories at build time and
// re-read products and stock at most once a minute; unknown slugs 404.
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `Shop ${category.name.toLowerCase()} from the atelier.`,
  };
}

export default async function CollectionPage(
  props: PageProps<"/collections/[slug]">,
) {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) notFound();

  return (
    <ProductListing
      eyebrow="Collection"
      title={category.name}
      products={category.products}
    />
  );
}
