import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

// The data access layer for auth. Every protected page and server action calls
// requireUser or requireAdmin itself; layouts and proxy.ts are not the check.

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireUser(returnTo?: string) {
  const session = await getSession();
  if (!session) {
    redirect(
      returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in",
    );
  }
  return session;
}

export function isAdmin(session: { user: { role?: string | null } }) {
  return session.user.role === "admin";
}

// For admin pages: non-admins get a 404 so the area isn't advertised.
export async function requireAdmin(returnTo = "/admin") {
  const session = await requireUser(returnTo);
  if (!isAdmin(session)) notFound();
  return session;
}

// For admin server actions and route handlers: throw rather than redirect.
export async function assertAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session)) throw new Error("Forbidden");
  return session;
}

// Only same-origin paths, so ?next= can't redirect off-site.
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
