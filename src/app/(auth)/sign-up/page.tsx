import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/session";
import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false },
};

export default async function Page(props: PageProps<"/sign-up">) {
  const { next: rawNext } = await props.searchParams;
  const next = safeNext(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  if (await getSession()) redirect(next ?? "/account");

  return (
    <section aria-labelledby="auth-title" className="container-prose section">
      <div className="mx-auto flex max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 id="auth-title" className="text-title">
            Create an account
          </h1>
          <p className="text-muted">Save your details for faster checkout.</p>
        </header>
        <AuthForm mode="sign-up" action={signUp} next={next} />
      </div>
    </section>
  );
}
