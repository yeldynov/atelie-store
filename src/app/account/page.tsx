import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { NameForm } from "./name-form";

export const metadata: Metadata = {
  title: "Account details",
  robots: { index: false },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

export default async function AccountPage() {
  const { user } = await requireUser("/account");

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-title">Account details</h1>
        <p className="text-muted">Welcome back, {user.name}.</p>
      </header>

      <section aria-labelledby="personal-title" className="flex flex-col gap-6">
        <h2 id="personal-title" className="border-b border-ink pb-3 text-label">
          Personal details
        </h2>
        <NameForm currentName={user.name} />
      </section>

      <section aria-labelledby="sign-in-title" className="flex flex-col gap-6">
        <h2 id="sign-in-title" className="border-b border-ink pb-3 text-label">
          Sign-in details
        </h2>
        <dl className="flex flex-col divide-y divide-line border-b border-line">
          <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-label">Email</dt>
            <dd className="break-all text-muted sm:text-right">{user.email}</dd>
          </div>
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-label">Member since</dt>
            <dd className="text-muted sm:text-right">
              <time dateTime={user.createdAt.toISOString()}>
                {dateFormat.format(user.createdAt)}
              </time>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
