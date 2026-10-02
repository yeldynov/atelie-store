"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Overview", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Orders", href: "/admin/orders" },
];

// "/admin" is current only on itself; sections also on their sub-pages.
const isCurrent = (pathname: string, href: string) =>
  pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

// Section navigation: a scrolling tab row on mobile, a sidebar from md up.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-labelledby="admin-nav-title" className="flex flex-col gap-4">
      <p id="admin-nav-title" className="text-label text-muted">
        Admin
      </p>
      <ul className="scroll-row h-11 items-center border-b border-line md:h-auto md:flex-col md:items-start md:gap-4 md:border-b-0">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              className="link-nav text-label"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="md:mt-4 md:border-t md:border-line md:pt-4 md:self-stretch">
          <Link href="/account" className="link-muted text-label">
            Back to account
          </Link>
        </li>
      </ul>
    </nav>
  );
}
