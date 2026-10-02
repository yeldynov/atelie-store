import { getBag } from "@/lib/bag-store";

// The header reads the bag from here in the browser, so the root layout never
// reads cookies and pages keep their static rendering.
export async function GET() {
  return Response.json(await getBag(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
