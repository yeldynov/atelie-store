import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

// Better Auth only warns about short secrets; refuse to start with one in production.
const secret = process.env.BETTER_AUTH_SECRET;
if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
  throw new Error(
    "BETTER_AUTH_SECRET must be a random value of at least 32 characters (generate one with `openssl rand -base64 32`)",
  );
}

export const auth = betterAuth({
  secret,
  database: drizzleAdapter(db, { provider: "pg" }),
  // nextCookies must stay last so it can set cookies from server actions.
  plugins: [nextCookies()],
});
