"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeNext } from "@/lib/session";
import { type FieldErrors, validateForm } from "@/lib/auth-validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: { name?: string; email?: string };
};

const UNEXPECTED_ERROR = "Something went wrong on our side. Please try again.";
const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const values = { name, email };

  const fieldErrors = validateForm("sign-up", { name, email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      if (error.body?.code?.startsWith("USER_ALREADY_EXISTS")) {
        return {
          fieldErrors: {
            email: "An account with this email already exists. Sign in instead.",
          },
          values,
        };
      }
      if (error.status === "TOO_MANY_REQUESTS") return { error: RATE_LIMITED, values };
      if (error.status === "BAD_REQUEST" || error.status === "UNPROCESSABLE_ENTITY") {
        return { error: error.body?.message ?? "Check your details and try again.", values };
      }
    }
    console.error("Sign-up failed", error);
    return { error: UNEXPECTED_ERROR, values };
  }

  redirect(safeNext(formData.get("next")) ?? "/account");
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const values = { email };

  const fieldErrors = validateForm("sign-in", { email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === "TOO_MANY_REQUESTS") return { error: RATE_LIMITED, values };
      if (error.status === "UNAUTHORIZED" || error.status === "BAD_REQUEST") {
        // One message for every credential failure, so the form doesn't reveal
        // which emails have accounts.
        return { error: "Incorrect email or password.", values };
      }
    }
    console.error("Sign-in failed", error);
    return { error: UNEXPECTED_ERROR, values };
  }

  redirect(safeNext(formData.get("next")) ?? "/account");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
