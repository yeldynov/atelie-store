import "server-only";

import { count, desc } from "drizzle-orm";
import { db } from "@/db";
import { products, user } from "@/db/schema";
import { assertAdmin } from "./session";

// Admin-only reads. Each function checks the role itself, so the data stays
// protected whichever page or action calls it.

export async function getAdminOverview(recentLimit = 20) {
  await assertAdmin();
  const [[users], [catalog], recentUsers] = await db.batch([
    db.select({ total: count() }).from(user),
    db.select({ total: count() }).from(products),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(recentLimit),
  ]);
  return { userCount: users.total, productCount: catalog.total, recentUsers };
}
