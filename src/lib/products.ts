// Product types and pure helpers shared by server and client code.
// Database reads live in ./product-queries.

import type { ProductImage } from "@/db/schema";

export type { ProductImage };

export type StockLevel = {
  size: string;
  quantity: number;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  // Links to /collections/[categorySlug].
  categorySlug: string;
  // In cents.
  price: number;
  badge?: string;
  images: ProductImage[];
  description: string;
  details: string[];
  // Units on hand per size, in display order; single-size items use ONE_SIZE.
  stock: StockLevel[];
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const ONE_SIZE = "One size";
const LOW_STOCK_THRESHOLD = 3;

/** Full Unsplash photo, cropped to fill. */
export const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2400&q=80`;

export function stockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function productStock(product: Product): StockStatus {
  const total = product.stock.reduce((sum, s) => sum + s.quantity, 0);
  return stockStatus(total);
}

export const stockLabel: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Only a few left",
  out_of_stock: "Sold out",
};

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const withCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats an amount in cents: "$1,250", or "$149.50" when there are cents. */
export const formatPrice = (cents: number) =>
  (cents % 100 === 0 ? wholeDollars : withCents).format(cents / 100);
