import type { Metadata } from "next";
import { getAdminCategories } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/session";
import { CategoryRow, CreateCategoryForm } from "./category-forms";

export const metadata: Metadata = {
  title: "Categories · Admin",
  robots: { index: false },
};

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const categories = await getAdminCategories();

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-title">Categories</h1>
        <p className="text-muted">
          Categories with products appear in the store navigation and at /collections/….
        </p>
      </header>

      <section aria-labelledby="new-category-title" className="flex flex-col gap-6">
        <h2 id="new-category-title" className="border-b border-ink pb-3 text-label">
          New category
        </h2>
        <CreateCategoryForm />
      </section>

      <section aria-labelledby="all-categories-title" className="flex flex-col gap-4">
        <h2 id="all-categories-title" className="text-label">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </h2>
        {categories.length === 0 ? (
          <p className="border-y border-line py-6 text-muted">No categories yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line border-y border-ink">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                id={category.id}
                name={category.name}
                slug={category.slug}
                productCount={category.productCount}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
