"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/actions";
import { authClient } from "@/lib/auth-client";
import { AccountIcon } from "./icons";

const CLOSE_DELAY_MS = 150;
const AUTH_PATHS = ["/sign-in", "/sign-up"];

// Header account icon with a hover pop-up of account actions. The session is
// read in the browser so the header doesn't make every page dynamic. On touch
// devices the icon is a plain link to /account.
export function AccountMenu() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function show() {
    clearTimeout(closeTimer.current);
    if (!open) {
      setOpen(true);
      // Sign-in and sign-out run as server actions, which the client session
      // store doesn't see, so refresh it whenever the menu opens.
      refetch();
    }
  }

  function hideSoon() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function onPointerEnter(event: PointerEvent) {
    if (event.pointerType === "mouse") show();
  }

  function onPointerLeave(event: PointerEvent) {
    if (event.pointerType === "mouse") hideSoon();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const next = AUTH_PATHS.includes(pathname) ? "" : `?next=${encodeURIComponent(pathname)}`;
  const user = session?.user;

  return (
    <div
      className="relative"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        // Keyboard focus opens it; a tap on touch screens just follows the link.
        if (event.target.matches(":focus-visible")) show();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Link
        ref={triggerRef}
        href="/account"
        className="btn-icon"
        aria-label="My account"
        aria-controls="account-menu"
        aria-expanded={open}
      >
        <AccountIcon />
      </Link>

      {/* pt-2 bridges the gap so the pointer can move into the panel. */}
      <div
        id="account-menu"
        hidden={!open}
        className="absolute top-full right-0 z-50 w-64 pt-2"
      >
        <div className="flex flex-col gap-4 border border-line bg-paper p-5">
          {isPending && !session ? (
            <p className="text-muted">Loading…</p>
          ) : user ? (
            <>
              <div className="flex flex-col gap-1">
                <p className="truncate text-label">Hello, {user.name}</p>
                <p className="truncate text-muted">{user.email}</p>
              </div>
              <ul className="flex flex-col gap-3 border-t border-line pt-4">
                <li>
                  <Link href="/account" className="link-nav">
                    Account details
                  </Link>
                </li>
                {user.role === "admin" && (
                  <li>
                    <Link href="/admin" className="link-nav">
                      Admin
                    </Link>
                  </li>
                )}
              </ul>
              <form action={signOut} className="border-t border-line pt-4">
                <SignOutButton />
              </form>
            </>
          ) : (
            <>
              <p className="text-label">My account</p>
              <Link href={`/sign-in${next}`} className="btn btn-primary btn-sm btn-block">
                Sign in
              </Link>
              <p className="text-muted">
                New to Atelier?{" "}
                <Link href={`/sign-up${next}`} className="link text-ink">
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
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
