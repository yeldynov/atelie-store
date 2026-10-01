import type { Metadata } from "next";
import { getAdminOverview } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const { userCount, productCount, recentUsers } = await getAdminOverview();

  return (
    <section aria-labelledby="admin-title" className="container-page section">
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 id="admin-title" className="text-title">
            Admin
          </h1>
          <p className="text-muted">Signed in as {user.email}</p>
        </header>

        <dl className="grid grid-cols-2 gap-px border border-line bg-line md:max-w-md">
          <div className="flex flex-col gap-1 bg-paper p-4">
            <dt className="text-label text-muted">Accounts</dt>
            <dd className="text-xl">{userCount}</dd>
          </div>
          <div className="flex flex-col gap-1 bg-paper p-4">
            <dt className="text-label text-muted">Products</dt>
            <dd className="text-xl">{productCount}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-4">
          <h2 className="text-label">Recent accounts</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-lg text-left">
              <thead className="border-b border-ink">
                <tr>
                  <th scope="col" className="py-3 pr-4 text-label">Name</th>
                  <th scope="col" className="py-3 pr-4 text-label">Email</th>
                  <th scope="col" className="py-3 pr-4 text-label">Role</th>
                  <th scope="col" className="py-3 text-label">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentUsers.map((account) => (
                  <tr key={account.id}>
                    <td className="py-3 pr-4">{account.name}</td>
                    <td className="py-3 pr-4">{account.email}</td>
                    <td className="py-3 pr-4 capitalize">{account.role ?? "customer"}</td>
                    <td className="py-3 text-muted">{dateFormat.format(account.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
