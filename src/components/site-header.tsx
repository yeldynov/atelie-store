import Link from "next/link";
import { getCategories } from "@/lib/product-queries";
import { AccountIcon, BagIcon, SearchIcon } from "./icons";

export async function SiteHeader() {
  // One link per category that has products, between the fixed entries.
  const categories = await getCategories();
  const navigation = [
    { label: "New in", href: "/new" },
    ...categories.map((category) => ({
      label: category.name,
      href: `/collections/${category.slug}`,
    })),
    { label: "Gifts", href: "/gifts" },
  ];

  return (
    <>
      <div className="flex h-9 items-center justify-center bg-ink px-gutter text-center text-paper">
        <p>Complimentary shipping and returns on all orders</p>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="container-bleed grid h-header grid-cols-[1fr_auto] items-center md:grid-cols-[1fr_auto_1fr]">
          <div className="hidden items-center md:flex">
            <Link href="/contact" className="link-nav">
              Contact us
            </Link>
          </div>

          <Link href="/" className="wordmark" aria-label="Atelier home">
            Atelier
          </Link>

          <div className="-mr-2.5 flex items-center justify-end">
            <button type="button" className="btn-icon" aria-label="Search">
              <SearchIcon />
            </button>
            <Link href="/account" className="btn-icon" aria-label="My account">
              <AccountIcon />
            </Link>
            <Link href="/bag" className="btn-icon" aria-label="Shopping bag">
              <BagIcon />
            </Link>
          </div>
        </div>

        <nav aria-label="Main" className="container-bleed">
          <ul className="scroll-row h-11 items-center md:justify-center-safe md:gap-8">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="link-nav text-label">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
