import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { authSessions } from "@/server/db/schema";
import type { AuthSessionRecord, AuthUserPrincipal } from "./types";

type SessionCreateInput = {
  sessionId: string;
  user: AuthUserPrincipal;
  tenantId: string | null;
  accessTokenExp: Date | null;
  refreshTokenEnc: string | null;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mapRow = (row: typeof authSessions.$inferSelect): AuthSessionRecord => ({
  sessionId: row.sessionId,
  sub: row.sub,
  email: row.email ?? null,
  name: row.name ?? null,
  tenantId: row.tenantId ?? null,
  accessTokenExp: toDateOrNull(row.accessTokenExp),
  refreshTokenEnc: row.refreshTokenEnc ?? null,
  idleExpiresAt: toDateOrNull(row.idleExpiresAt) ?? new Date(0),
  absoluteExpiresAt: toDateOrNull(row.absoluteExpiresAt) ?? new Date(0),
  revokedAt: toDateOrNull(row.revokedAt),
  createdAt: toDateOrNull(row.createdAt),
  updatedAt: toDateOrNull(row.updatedAt),
});

export async function getAuthSessionById(
  sessionId: string,
): Promise<AuthSessionRecord | null> {
  const rows = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.sessionId, sessionId))
    .limit(1);

  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function createAuthSession(input: SessionCreateInput) {
  const now = new Date();

  await db.insert(authSessions).values({
    sessionId: input.sessionId,
    sub: input.user.sub,
    email: input.user.email,
    name: input.user.name,
    tenantId: input.tenantId,
    accessTokenExp: input.accessTokenExp,
    refreshTokenEnc: input.refreshTokenEnc,
    idleExpiresAt: input.idleExpiresAt,
    absoluteExpiresAt: input.absoluteExpiresAt,
    createdAt: now,
    updatedAt: now,
  });
}

export async function revokeAuthSession(sessionId: string) {
  const now = new Date();

  await db
    .update(authSessions)
    .set({
      revokedAt: now,
      updatedAt: now,
    })
    .where(eq(authSessions.sessionId, sessionId));
}

type TouchSessionInput = {
  sessionId: string;
  idleExpiresAt?: Date;
  accessTokenExp?: Date | null;
  refreshTokenEnc?: string | null;
};

export async function touchAuthSession(input: TouchSessionInput) {
  const updates: Partial<typeof authSessions.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.idleExpiresAt) {
    updates.idleExpiresAt = input.idleExpiresAt;
  }

  if (Object.prototype.hasOwnProperty.call(input, "accessTokenExp")) {
    updates.accessTokenExp = input.accessTokenExp ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "refreshTokenEnc")) {
    updates.refreshTokenEnc = input.refreshTokenEnc ?? null;
  }

  await db
    .update(authSessions)
    .set(updates)
    .where(eq(authSessions.sessionId, input.sessionId));
}
