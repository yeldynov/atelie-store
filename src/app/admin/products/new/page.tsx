import type { Metadata } from "next";
import Link from "next/link";
import { getAdminCategoryOptions } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/session";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "New product · Admin",
  robots: { index: false },
};

export default async function NewProductPage() {
  await requireAdmin("/admin/products/new");
  const categories = await getAdminCategoryOptions();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link href="/admin/products" className="link-muted self-start text-label">
        ← All products
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-title">New product</h1>
        <p className="text-muted">
          The product goes live when you create it. It shows as sold out until you add stock.
        </p>
      </header>
      {categories.length === 0 ? (
        <p className="border-y border-line py-6 text-muted">
          Add a category before creating products.
        </p>
      ) : (
        <ProductForm
          mode="create"
          action={createProduct}
          categories={categories}
          initial={{
            name: "",
            slug: "",
            categoryId: "",
            price: "",
            badge: "",
            description: "",
            details: "",
            images: [],
            sizes: "",
          }}
        />
      )}
    </div>
  );
}
