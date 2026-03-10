import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  platformEntitlementEvents,
  platformEntitlements,
} from "@/server/db/schema";
import { assertValidPlatformSignature, PlatformCallbackError } from "./signature";
import {
  evictPlatformContextCacheByTenant,
} from "./context";
import {
  PLATFORM_PRODUCT_ID,
  platformEntitlementCallbackSchema,
} from "./types";

const toDateOrNull = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export async function processPlatformEntitlementCallback(input: {
  body: string;
  headers: Headers;
}) {
  assertValidPlatformSignature({
    timestamp: input.headers.get("X-Platform-Timestamp"),
    keyId: input.headers.get("X-Platform-Key-Id"),
    signature: input.headers.get("X-Platform-Signature"),
    body: input.body,
  });

  const headerEventId = input.headers.get("X-Platform-Event-Id");
  if (!headerEventId) {
    throw new PlatformCallbackError(
      400,
      "missing_event_id",
      "X-Platform-Event-Id 헤더가 필요합니다.",
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(input.body);
  } catch {
    throw new PlatformCallbackError(
      400,
      "invalid_json",
      "Platform callback body JSON 파싱에 실패했습니다.",
    );
  }

  const payload = platformEntitlementCallbackSchema.parse(parsedBody);
  if (payload.eventId !== headerEventId) {
    throw new PlatformCallbackError(
      400,
      "event_id_mismatch",
      "header/payload eventId 가 일치하지 않습니다.",
    );
  }

  if (payload.productId !== PLATFORM_PRODUCT_ID) {
    return {
      duplicate: false,
      ignored: true,
      eventId: payload.eventId,
      tenantId: payload.tenantId,
      productId: payload.productId,
    };
  }

  const transactionResult = await db.transaction(async (tx) => {
    const insertedEvents = await tx
      .insert(platformEntitlementEvents)
      .values({
        eventId: payload.eventId,
        eventType: payload.eventType,
        tenantId: payload.tenantId,
        productId: payload.productId,
        occurredAt: toDateOrNull(payload.occurredAt),
        keyId: input.headers.get("X-Platform-Key-Id"),
      })
      .onConflictDoNothing({
        target: platformEntitlementEvents.eventId,
      })
      .returning({
        eventId: platformEntitlementEvents.eventId,
      });

    if (insertedEvents.length === 0) {
      return {
        duplicate: true,
      };
    }

    const now = new Date();
    const rows = await tx
      .insert(platformEntitlements)
      .values({
        tenantId: payload.tenantId,
        productId: payload.productId,
        planCode: payload.entitlement.planCode ?? null,
        status: payload.entitlement.status,
        seatLimit: payload.entitlement.seatLimit ?? null,
        expiresAt: toDateOrNull(payload.entitlement.expiresAt ?? null),
        sourceType: payload.entitlement.sourceType ?? null,
        lastEventId: payload.eventId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          platformEntitlements.tenantId,
          platformEntitlements.productId,
        ],
        set: {
          planCode: payload.entitlement.planCode ?? null,
          status: payload.entitlement.status,
          seatLimit: payload.entitlement.seatLimit ?? null,
          expiresAt: toDateOrNull(payload.entitlement.expiresAt ?? null),
          sourceType: payload.entitlement.sourceType ?? null,
          lastEventId: payload.eventId,
          updatedAt: now,
        },
      })
      .returning();

    return {
      duplicate: false,
      entitlement: rows[0] ?? null,
    };
  });

  evictPlatformContextCacheByTenant(payload.tenantId);

  return {
    duplicate: transactionResult.duplicate,
    ignored: false,
    eventId: payload.eventId,
    tenantId: payload.tenantId,
    productId: payload.productId,
  };
}
