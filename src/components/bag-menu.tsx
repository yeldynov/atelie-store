"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { loadBag, useBag } from "@/lib/bag-client";
import { formatPrice } from "@/lib/products";
import { BagLineItem } from "./bag-line";
import { BagIcon } from "./icons";

const CLOSE_DELAY_MS = 150;

// Header bag icon with an item count and a hover mini bag. Like AccountMenu,
// the bag is read in the browser so the header doesn't make every page
// dynamic. On touch devices, and on /bag itself, the icon is a plain link.
export function BagMenu() {
  const bag = useBag();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const onBagPage = pathname === "/bag";

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    loadBag();
    return () => clearTimeout(closeTimer.current);
  }, []);

  function show() {
    clearTimeout(closeTimer.current);
    if (!open && !onBagPage) {
      setOpen(true);
      // Prices and stock may have changed since the last load.
      loadBag();
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

  const count = bag?.count ?? 0;
  const items = bag?.items ?? [];

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
        // A removed line takes focus with it (relatedTarget null); stay open then.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <Link
        ref={triggerRef}
        href="/bag"
        className="inline-flex h-10 min-w-10 items-center justify-center gap-1 px-2.5 transition-opacity hover:opacity-60"
        aria-label={count > 0 ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}
        aria-controls="bag-menu"
        aria-expanded={open}
      >
        <BagIcon />
        {count > 0 && (
          <span aria-hidden="true" className="min-w-3 text-xs tabular-nums">
            {count}
          </span>
        )}
      </Link>

      {/* pt-2 bridges the gap so the pointer can move into the panel. */}
      <div
        id="bag-menu"
        hidden={!open}
        className="absolute top-full right-0 z-50 w-[min(24rem,calc(100vw-2*var(--gutter)))] pt-2"
      >
        <div className="flex flex-col border border-line bg-paper">
          <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-label">Shopping bag</h2>
            {count > 0 && (
              <p className="text-muted">
                {count} {count === 1 ? "item" : "items"}
              </p>
            )}
          </div>

          {!bag ? (
            <p className="px-5 py-8 text-center text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
              <p className="text-muted">Your bag is empty.</p>
              <Link href="/new" className="btn btn-secondary btn-sm">
                Shop new arrivals
              </Link>
            </div>
          ) : (
            <>
              <ul className="max-h-[min(24rem,55vh)] divide-y divide-line overflow-y-auto overscroll-contain px-5">
                {items.map((item) => (
                  <li key={`${item.slug}/${item.size}`}>
                    <BagLineItem item={item} compact />
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
                <div className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span>{formatPrice(bag.subtotal)}</span>
                </div>
                {items.some((item) => item.issue) && (
                  <p className="text-error">Some items changed. See your bag for details.</p>
                )}
                <Link href="/bag" className="btn btn-primary btn-block">
                  View bag
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
