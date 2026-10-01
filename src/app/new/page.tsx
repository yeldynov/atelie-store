import type { Metadata } from "next";
import { ProductListing } from "@/components/product-listing";
import { getNewArrivals } from "@/lib/product-queries";

// Re-read the catalog (new products, stock) at most once a minute.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest pieces from the atelier.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals();

  return <ProductListing eyebrow="New in" title="New arrivals" products={products} />;
}
