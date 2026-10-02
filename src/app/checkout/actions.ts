"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { lineKey } from "@/lib/bag";
import { getBag, readBag, resolveCustomerBag, writeBag } from "@/lib/bag-store";
import { abandonUnpaidCheckouts, startCheckout } from "@/lib/checkout";
import { getOrderBySessionForUser } from "@/lib/orders";
import { getSession, requireUser } from "@/lib/session";
import type { BagActionResult } from "../bag/actions";

export type CheckoutState = { error?: string };

// The form posts nothing: the bag is read from the cookie and priced from the
// database on the server.
export async function checkout(): Promise<CheckoutState> {
  const { user } = await requireUser("/bag");

  let url: string;
  try {
    // Release any earlier checkout before pricing the bag, so its held units
    // are back in stock and aren't counted twice.
    await abandonUnpaidCheckouts(user.id);
    const result = await startCheckout(user, await getBag());
    if (!result.ok) {
      // Stock or prices moved: re-render the bag with the current numbers.
      refresh();
      return { error: result.error };
    }
    url = result.url;
  } catch (error) {
    console.error("Starting checkout failed", error);
    return { error: "We couldn't start checkout. Please try again." };
  }

  redirect(url);
}

/**
 * Removes a paid (or settling) order's lines from the bag. Called by the
 * success page; it only reads the order's status, never sets it.
 */
export async function clearPurchasedItems(sessionId: unknown): Promise<BagActionResult> {
  const session = await getSession();
  if (!session || typeof sessionId !== "string") {
    return { ok: false, error: "Order not found." };
  }

  try {
    const order = await getOrderBySessionForUser(sessionId, session.user.id);
    const settled =
      order?.status === "confirmed" ||
      (order?.status === "pending" && order.paymentStatus === "processing");
    if (!order || !settled) return { ok: false, error: "Order not found." };

    const purchased = new Set(order.items.map((item) => lineKey(item.productSlug, item.size)));
    const lines = (await readBag()).filter(
      (line) => !purchased.has(lineKey(line.slug, line.size)),
    );
    await writeBag(lines);
    return { ok: true, bag: await resolveCustomerBag(lines) };
  } catch (error) {
    console.error("Clearing purchased items failed", error);
    return { ok: false, error: "Something went wrong on our side." };
  }
}
