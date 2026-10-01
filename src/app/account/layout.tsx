import { getSession, isAdmin } from "@/lib/session";
import { AccountNav } from "./account-nav";

// Shell for /account/*. Pages still call requireUser themselves; this layout
// only reads the session to decide whether to show the admin link.
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const session = await getSession();

  return (
    <div className="container-page section">
      <div className="grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-16">
        <AccountNav showAdmin={session ? isAdmin(session) : false} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
