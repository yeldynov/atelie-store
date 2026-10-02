"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/actions";

const links = [
  { label: "Account details", href: "/account" },
  { label: "Orders", href: "/account/orders" },
];

// "/account" is current only on itself; sections also on their sub-pages.
const isCurrent = (pathname: string, href: string) =>
  pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));

// Section navigation: a scrolling tab row on mobile, a sidebar from md up.
export function AccountNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const items = showAdmin ? [...links, { label: "Admin", href: "/admin" }] : links;

  return (
    <nav aria-labelledby="account-nav-title" className="flex flex-col gap-4">
      <p id="account-nav-title" className="text-label text-muted">
        My account
      </p>
      <ul className="scroll-row h-11 items-center border-b border-line md:h-auto md:flex-col md:items-start md:gap-4 md:border-b-0">
        {items.map((item) => (
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
          <form action={signOut}>
            <SignOutButton />
          </form>
        </li>
      </ul>
    </nav>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="link-muted text-label disabled:text-disabled"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
