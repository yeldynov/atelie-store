// Usage: pnpm auth:make-admin <email> [--revoke]
// The only way to change a role: Better Auth rejects `role` in sign-up and
// update-user requests (input: false in src/lib/auth.ts).
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { user } from "./schema";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Usage: pnpm auth:make-admin <email> [--revoke]");
  process.exit(1);
}

async function main(email: string) {
  const role = flag === "--revoke" ? "customer" : "admin";
  const updated = await db
    .update(user)
    .set({ role })
    .where(eq(user.email, email.trim().toLowerCase()))
    .returning({ email: user.email });

  if (updated.length === 0) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }
  console.log(`${updated[0].email} is now ${role}`);
}

main(email).catch((error) => {
  console.error(error);
  process.exit(1);
});
