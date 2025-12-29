import { z } from "zod";
import {
  getSmtpConfig,
  listSmtpConfigs,
  upsertSmtpConfig,
  updateLastTestResult,
  deleteSmtpConfig,
  type PersistedSmtpConfig,
} from "../dao/smtpDao";
import {
  assertHostNotPrivateOrLocal,
  validateSmtpInput,
  validateTestRecipientEmail,
} from "../lib/ssrfGuard";
import { sendTestEmail } from "../lib/smtp";

export class AdminSmtpError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(String(body.message ?? body.error ?? "SMTP 요청 처리 중 오류가 발생했습니다."));
    this.status = status;
    this.body = body;
  }
}

const updateSchema = z.object({
  host: z.string().trim().min(1, "SMTP 호스트는 필수입니다."),
  port: z.coerce.number().int(),
  securityMode: z.enum(["SMTPS", "STARTTLS", "NONE"]).default("STARTTLS"),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1).optional(),
  fromEmail: z.string().trim().email("유효한 발신 이메일을 입력하세요."),
  fromName: z.string().trim().optional(),
  replyTo: z.string().trim().email("회신 이메일 형식이 올바르지 않습니다.").optional(),
  tlsVerify: z.boolean().optional(),
  rateLimitPerMin: z.coerce.number().int().min(1).optional(),
  allowedRecipientDomains: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().optional(),
});

const testSchema = z.object({
  testRecipientEmail: z.string().trim().min(1),
});

const redactPattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const extractEmailDomain = (value?: string | null) => {
  if (!value || !value.includes("@")) return "";
  const [, domain = ""] = value.split("@");
  return domain.trim().toLowerCase();
};

const sanitizeErrorMessage = (raw: string, config: PersistedSmtpConfig) => {
  const secrets = [config.password ?? "", config.username ?? ""]
    .filter((value) => Boolean(value))
    .map((value) => value.trim())
    .filter(Boolean);

  let sanitized = raw || "SMTP 테스트 중 오류가 발생했습니다.";
  for (const secret of secrets) {
    sanitized = sanitized.replace(new RegExp(redactPattern(secret), "gi"), "***");
  }

  if (sanitized.length > 400) {
    return sanitized.slice(0, 400);
  }
  return sanitized;
};

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  "535": "SMTP 서버가 사용자명 또는 비밀번호를 거부했습니다. 자격 증명을 다시 확인하세요.",
  EAUTH: "SMTP 서버 인증에 실패했습니다. 계정 또는 앱 비밀번호를 확인하세요.",
  ETIMEDOUT: "SMTP 서버 응답이 지연되고 있습니다. 네트워크 및 포트 설정을 확인하세요.",
  ECONNECTION: "SMTP 서버에 연결하지 못했습니다. 호스트/포트 또는 TLS 설정을 확인하세요.",
};

const mapFriendlySmtpError = (code: string | number, fallback: string) => {
  const key = String(code).toUpperCase();
  return FRIENDLY_ERROR_MESSAGES[key] ?? fallback;
};

const extractCodeFromMessage = (message: string): string | null => {
  const match = message.match(/\b(5\d{2})\b/);
  return match ? match[1] : null;
};

export const buildDefaultResponse = (tenantId: string) => ({
  tenantId,
  host: "",
  port: 587 as const,
  securityMode: "STARTTLS" as const,
  username: "",
  fromEmail: "",
  fromName: "",
  replyTo: "",
  tlsVerify: true,
  rateLimitPerMin: 60,
  allowedRecipientDomains: [] as string[],
  isActive: true,
  lastTestedAt: null,
  lastTestStatus: null,
  lastTestError: null,
  hasPassword: false,
});

const toResponsePayload = (config: PersistedSmtpConfig) => ({
  tenantId: config.tenantId,
  host: config.host,
  port: config.port,
  securityMode: config.securityMode,
  username: config.username ?? "",
  fromEmail: config.fromEmail,
  fromName: config.fromName ?? "",
  replyTo: config.replyTo ?? "",
  tlsVerify: config.tlsVerify,
  rateLimitPerMin: config.rateLimitPerMin,
  allowedRecipientDomains: config.allowedRecipientDomains ?? [],
  isActive: config.isActive,
  lastTestedAt: config.lastTestedAt ?? null,
  lastTestStatus: config.lastTestStatus ?? null,
  lastTestError: config.lastTestError ?? null,
  hasPassword: config.hasPassword,
});

export async function fetchTenantSmtpConfig(tenantId: string) {
  const normalizedTenantId = (tenantId || "").trim();
  if (!normalizedTenantId) {
    throw new AdminSmtpError(400, { message: "tenantId 파라미터가 필요합니다." });
  }
  const config = await getSmtpConfig(normalizedTenantId);
  if (!config) {
    return buildDefaultResponse(normalizedTenantId);
  }
  return toResponsePayload(config);
}

export async function fetchSmtpConfigSummaries() {
  const configs = await listSmtpConfigs();
  return configs.map((config) => ({
    tenantId: config.tenantId,
    host: config.host,
    port: config.port,
    securityMode: config.securityMode,
    fromEmail: config.fromEmail,
    isActive: config.isActive,
    hasPassword: config.hasPassword,
    lastTestedAt: config.lastTestedAt ?? null,
    lastTestStatus: config.lastTestStatus ?? null,
    updatedAt: config.updatedAt,
  }));
}

export async function deleteTenantSmtpConfig(tenantId: string) {
  const normalizedTenantId = (tenantId || "").trim();
  if (!normalizedTenantId) {
    throw new AdminSmtpError(400, { message: "tenantId 파라미터가 필요합니다." });
  }
  const exists = await getSmtpConfig(normalizedTenantId);
  if (!exists) {
    throw new AdminSmtpError(404, { message: "SMTP 설정이 존재하지 않습니다." });
  }
  const deleted = await deleteSmtpConfig(normalizedTenantId);
  if (!deleted) {
    throw new AdminSmtpError(500, { message: "SMTP 설정 삭제에 실패했습니다." });
  }
  return { ok: true };
}

export async function saveTenantSmtpConfig(tenantId: string, body: unknown) {
  const normalizedTenantId = (tenantId || "").trim();
  if (!normalizedTenantId) {
    throw new AdminSmtpError(400, { message: "tenantId 파라미터가 필요합니다." });
  }
  try {
    const parsed = updateSchema.parse(body);
    const normalized = validateSmtpInput({
      host: parsed.host,
      port: parsed.port,
      securityMode: parsed.securityMode,
    });
    await assertHostNotPrivateOrLocal(normalized.host);

    const allowedDomains = parsed.allowedRecipientDomains?.map((domain) =>
      domain.trim().toLowerCase(),
    );

    await upsertSmtpConfig({
      tenantId: normalizedTenantId,
      host: normalized.host,
      port: normalized.port,
      securityMode: normalized.securityMode,
      username: parsed.username?.trim() || null,
      password: parsed.password ?? undefined,
      fromEmail: parsed.fromEmail.trim(),
      fromName: parsed.fromName?.trim() || null,
      replyTo: parsed.replyTo?.trim() || null,
      tlsVerify: parsed.tlsVerify ?? true,
      rateLimitPerMin: parsed.rateLimitPerMin ?? 60,
      allowedRecipientDomains: allowedDomains,
      isActive: parsed.isActive ?? true,
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AdminSmtpError(400, {
        message: "입력값을 확인하세요.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    throw new AdminSmtpError(400, {
      message: error instanceof Error ? error.message : "SMTP 설정 저장 중 오류가 발생했습니다.",
    });
  }
}

export async function testTenantSmtpConfig(tenantId: string, body: unknown) {
  const normalizedTenantId = (tenantId || "").trim();
  if (!normalizedTenantId) {
    throw new AdminSmtpError(400, { message: "tenantId 파라미터가 필요합니다." });
  }

  let recipientEmail: string | null = null;
  try {
    const parsedBody = testSchema.parse(body);
    const config = await getSmtpConfig(normalizedTenantId);
    if (!config) {
      throw new AdminSmtpError(404, { message: "SMTP 설정이 존재하지 않습니다." });
    }

    const fallbackSet = new Set(
      (config.allowedRecipientDomains ?? []).map((domain) => domain.trim().toLowerCase()),
    );
    const fromDomain = extractEmailDomain(config.fromEmail);
    if (fromDomain) fallbackSet.add(fromDomain);
    const usernameDomain = extractEmailDomain(config.username);
    if (usernameDomain) fallbackSet.add(usernameDomain);
    const fallbackDomains = Array.from(fallbackSet);

    const normalizedRecipient = validateTestRecipientEmail(
      parsedBody.testRecipientEmail,
      fallbackDomains,
    );
    recipientEmail = normalizedRecipient;

    if (!config.isActive) {
      throw new AdminSmtpError(409, { message: "SMTP 설정이 비활성화되어 있습니다." });
    }

    if (!config.password) {
      throw new AdminSmtpError(400, { message: "SMTP 비밀번호가 설정되어 있지 않습니다." });
    }

    const normalized = validateSmtpInput({
      host: config.host,
      port: config.port,
      securityMode: config.securityMode,
    });
    if (normalized.port !== 465 && normalized.port !== 587) {
      throw new AdminSmtpError(400, {
        message: "테스트 발송은 465 또는 587 포트에서만 지원됩니다.",
      });
    }
    await assertHostNotPrivateOrLocal(normalized.host);

    const passwordSample = config.password ?? "";
    console.log("[SMTP_TEST_DEBUG]", {
      tenantId: normalizedTenantId,
      host: config.host,
      port: config.port,
      securityMode: config.securityMode,
      username: config.username ?? "(none)",
      passwordLength: passwordSample.length,
      passwordHasLeadingSpace: passwordSample.startsWith(" "),
      passwordHasTrailingSpace: passwordSample.endsWith(" "),
      passwordHasNewline: /\r|\n/.test(passwordSample),
    });

    await sendTestEmail({
      smtpConfig: config,
      toEmail: normalizedRecipient,
    });
    await updateLastTestResult({
      tenantId: normalizedTenantId,
      success: true,
      errorMessage: null,
    });

    return { ok: true, message: "테스트 메일을 발송했습니다." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AdminSmtpError(400, {
        message: "입력값을 확인하세요.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const config = normalizedTenantId ? await getSmtpConfig(normalizedTenantId) : null;
    const sanitizedMessage =
      config && error instanceof Error
        ? sanitizeErrorMessage(error.message, config)
        : "SMTP 테스트 중 오류가 발생했습니다.";

    if (normalizedTenantId) {
      await updateLastTestResult({
        tenantId: normalizedTenantId,
        success: false,
        errorMessage: sanitizedMessage,
      });
    }

    const rawCode =
      (error as any)?.responseCode || (error as any)?.code || (error as any)?.errno || null;
    const shouldLogStack = process.env.NODE_ENV !== "production";
    const errorLog: Record<string, unknown> = {
      tenantId: normalizedTenantId,
      recipientEmail,
      code: rawCode,
      message: error instanceof Error ? error.message : String(error),
    };
    if (shouldLogStack && error instanceof Error && error.stack) {
      errorLog.stack = error.stack;
    }
    console.error("[SMTP_TEST_FAILED]", errorLog);

    const inferredCode =
      rawCode ??
      (error instanceof Error ? extractCodeFromMessage(error.message) : null) ??
      extractCodeFromMessage(sanitizedMessage);

    const userMessage =
      typeof inferredCode === "number" || typeof inferredCode === "string"
        ? mapFriendlySmtpError(inferredCode, sanitizedMessage)
        : sanitizedMessage;

    throw new AdminSmtpError(400, { message: userMessage });
  }
}
