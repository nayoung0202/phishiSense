import { eq } from "drizzle-orm";
import { db } from "../db";
import { smtpAccountsTable, type SmtpAccountRow } from "../db/schema";
import { decryptSecret, encryptSecret, hasSmtpSecret } from "../utils/crypto";

export type SecurityMode = "SMTPS" | "STARTTLS" | "NONE";

export type PersistedSmtpConfig = {
  tenantId: string;
  name: string;
  host: string;
  port: number;
  securityMode: SecurityMode;
  username: string | null;
  password: string | null;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  tlsVerify: boolean;
  rateLimitPerMin: number;
  allowedRecipientDomains: string[];
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestStatus: "success" | "failure" | null;
  lastTestError: string | null;
  hasPassword: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type PersistPayload = {
  tenantId: string;
  host: string;
  port: number;
  securityMode: SecurityMode;
  username?: string | null;
  password?: string | null;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
  tlsVerify: boolean;
  rateLimitPerMin: number;
  allowedRecipientDomains?: string[];
  isActive: boolean;
};

const parseAllowedDomains = (value?: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
};

const stringifyAllowedDomains = (domains?: string[]) =>
  JSON.stringify(
    Array.from(new Set(domains?.map((domain) => domain.trim().toLowerCase()).filter(Boolean) ?? [])),
  );

const normalizeStatus = (value?: string | null): "success" | "failure" | null => {
  if (value === "success" || value === "failure") {
    return value;
  }
  return null;
};

const toIsoString = (value?: Date | string | null) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const mapRow = (row: SmtpAccountRow): PersistedSmtpConfig => ({
  tenantId: row.id,
  name: row.name,
  host: row.host,
  port: row.port,
  securityMode: (row.securityMode as SecurityMode) ?? "STARTTLS",
  username: row.username ?? null,
  password: row.passwordEnc ? decryptSecret(row.passwordEnc) : null,
  fromEmail: row.fromEmail ?? "",
  fromName: row.fromName ?? null,
  replyTo: row.replyTo ?? null,
  tlsVerify: row.tlsVerify ?? true,
  rateLimitPerMin: row.rateLimitPerMin ?? 60,
  allowedRecipientDomains: parseAllowedDomains(row.allowedDomainsJson),
  isActive: row.isActive ?? true,
  lastTestedAt: toIsoString(row.lastTestedAt),
  lastTestStatus: normalizeStatus(row.lastTestStatus),
  lastTestError: row.lastTestError ?? null,
  hasPassword: Boolean(row.passwordEnc),
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
});

export async function listSmtpConfigs(): Promise<PersistedSmtpConfig[]> {
  const rows = await db.select().from(smtpAccountsTable);
  return rows.map(mapRow);
}

async function getSmtpRow(tenantId: string) {
  const rows = await db
    .select()
    .from(smtpAccountsTable)
    .where(eq(smtpAccountsTable.id, tenantId))
    .limit(1);
  return rows[0];
}

export async function getSmtpConfig(tenantId: string): Promise<PersistedSmtpConfig | null> {
  const row = await getSmtpRow(tenantId);
  return row ? mapRow(row) : null;
}

export async function upsertSmtpConfig(payload: PersistPayload): Promise<PersistedSmtpConfig> {
  const existing = await getSmtpRow(payload.tenantId);
  const now = new Date();
  const encryptedPassword =
    payload.password !== undefined
      ? payload.password
        ? encryptSecret(payload.password)
        : ""
      : existing?.passwordEnc ?? "";

  if (payload.password && !hasSmtpSecret()) {
    console.warn("[smtpDao] SMTP_SECRET가 설정되지 않아 개발용 임시 키를 사용합니다.");
  }

  if (existing) {
    await db
      .update(smtpAccountsTable)
      .set({
        name: existing.name,
        host: payload.host,
        port: payload.port,
        secure: payload.securityMode === "SMTPS",
        securityMode: payload.securityMode,
        username: payload.username ?? null,
        passwordEnc: encryptedPassword,
        fromEmail: payload.fromEmail,
        fromName: payload.fromName ?? null,
        replyTo: payload.replyTo ?? null,
        tlsVerify: payload.tlsVerify,
        rateLimitPerMin: payload.rateLimitPerMin,
        allowedDomainsJson:
          payload.allowedRecipientDomains !== undefined
            ? stringifyAllowedDomains(payload.allowedRecipientDomains)
            : existing.allowedDomainsJson ?? "[]",
        isActive: payload.isActive,
        updatedAt: now,
      })
      .where(eq(smtpAccountsTable.id, payload.tenantId));
  } else {
    await db
      .insert(smtpAccountsTable)
      .values({
        id: payload.tenantId,
        name: payload.tenantId,
        host: payload.host,
        port: payload.port,
        secure: payload.securityMode === "SMTPS",
        securityMode: payload.securityMode,
        username: payload.username ?? null,
        passwordEnc: encryptedPassword ?? "",
        fromEmail: payload.fromEmail,
        fromName: payload.fromName ?? null,
        replyTo: payload.replyTo ?? null,
        tlsVerify: payload.tlsVerify,
        rateLimitPerMin: payload.rateLimitPerMin,
        allowedDomainsJson: stringifyAllowedDomains(payload.allowedRecipientDomains),
        isActive: payload.isActive,
        createdAt: now,
        updatedAt: now,
      });
  }

  const config = await getSmtpConfig(payload.tenantId);
  if (!config) {
    throw new Error("SMTP 설정을 저장하지 못했습니다.");
  }
  return config;
}

export async function updateLastTestResult(options: {
  tenantId: string;
  success: boolean;
  errorMessage?: string | null;
}) {
  const now = new Date();
  await db
    .update(smtpAccountsTable)
    .set({
      lastTestedAt: now,
      lastTestStatus: options.success ? "success" : "failure",
      lastTestError: options.errorMessage ?? null,
      updatedAt: now,
    })
    .where(eq(smtpAccountsTable.id, options.tenantId));
}

export async function deleteSmtpConfig(tenantId: string): Promise<boolean> {
  const rows = await db
    .delete(smtpAccountsTable)
    .where(eq(smtpAccountsTable.id, tenantId))
    .returning({ id: smtpAccountsTable.id });
  return rows.length > 0;
}
