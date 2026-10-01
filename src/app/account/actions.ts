"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { validateField } from "@/lib/auth-validation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export type NameFormState = {
  status?: "saved";
  error?: string;
};

export async function updateName(
  _prev: NameFormState,
  formData: FormData,
): Promise<NameFormState> {
  await requireUser("/account");

  const raw = formData.get("name");
  const name = typeof raw === "string" ? raw.trim() : "";
  const error = validateField("sign-up", "name", name);
  if (error) return { error };

  try {
    // Only `name` is sent; role and email are not updatable through this action.
    await auth.api.updateUser({ body: { name }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError && error.status === "TOO_MANY_REQUESTS") {
      return { error: "Too many attempts. Please wait a minute and try again." };
    }
    console.error("Name update failed", error);
    return { error: "Something went wrong on our side. Please try again." };
  }

  refresh();
  return { status: "saved" };
}
