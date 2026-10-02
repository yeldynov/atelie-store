import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { abandonCheckout } from "@/lib/checkout";
import { getOrder } from "@/lib/orders";
import { getSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

// "Continue to payment" from the bag: back to the customer's open Stripe
// Checkout Session. If it can no longer be paid, release it and say so.
export async function GET(request: NextRequest) {
  redirect(await resumeTarget(request.nextUrl.searchParams.get("order")));
}

async function resumeTarget(orderId: string | null) {
  const session = await getSession();
  if (!session || !orderId) return "/bag";

  try {
    const order = await getOrder(orderId);
    if (
      order?.userId !== session.user.id ||
      order.status !== "pending" ||
      !order.stripeCheckoutSessionId
    ) {
      return "/bag";
    }

    const checkout = await getStripe().checkout.sessions.retrieve(
      order.stripeCheckoutSessionId,
    );
    if (checkout.status === "open" && checkout.url) return checkout.url;
    if (checkout.status === "complete") {
      return `/checkout/success?session_id=${encodeURIComponent(checkout.id)}`;
    }
    await abandonCheckout(order.id, order.stripeCheckoutSessionId);
    return "/bag?checkout=expired";
  } catch (error) {
    console.error("Resuming checkout failed", error);
    return "/bag?checkout=error";
  }
}
