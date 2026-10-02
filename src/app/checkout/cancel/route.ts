import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { abandonCheckout } from "@/lib/checkout";
import { getOrder } from "@/lib/orders";
import { getSession } from "@/lib/session";

// Stripe's cancel_url: the customer left Checkout. Close their session and
// release the stock now instead of holding it until the session expires. The
// bag cookie was never touched, so they land back on an intact bag.
export async function GET(request: NextRequest) {
  const session = await getSession();
  const orderId = request.nextUrl.searchParams.get("order");

  if (session && orderId) {
    try {
      const order = await getOrder(orderId);
      if (
        order?.userId === session.user.id &&
        order.status === "pending" &&
        order.paymentStatus === "unpaid"
      ) {
        await abandonCheckout(order.id, order.stripeCheckoutSessionId);
      }
    } catch (error) {
      // The session still expires on its own and the webhook releases it.
      console.error("Cancelling checkout failed", error);
    }
  }

  redirect("/bag?checkout=cancelled");
}
