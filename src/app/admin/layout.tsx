import { requireAdmin } from "@/lib/session";
import { AdminNav } from "./admin-nav";

// Shell for /admin/*. It checks the role so non-admins never receive the admin
// nav, but it is not the guard: every page calls requireAdmin itself, and every
// admin server action and admin query calls assertAdmin first.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="container-page section">
      {/* minmax(0,1fr) on mobile: the nav's scroll row and wide tables scroll
          inside the column instead of widening the page. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-16">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
