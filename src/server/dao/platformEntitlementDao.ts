import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { platformEntitlements } from "@/server/db/schema";

export async function getPlatformEntitlement(
  tenantId: string,
  productId: string,
) {
  const rows = await db
    .select()
    .from(platformEntitlements)
    .where(
      and(
        eq(platformEntitlements.tenantId, tenantId),
        eq(platformEntitlements.productId, productId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
