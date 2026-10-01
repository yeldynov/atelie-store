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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // "customer" or "admin". input: false keeps it out of sign-up requests;
      // promote with `pnpm auth:make-admin <email>`.
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  // No cookie cache: every session read hits the database, so sign-outs and
  // role changes take effect on the next request.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: { enabled: true },
  // nextCookies must stay last so it can set cookies from server actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
