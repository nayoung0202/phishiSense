import { Router } from "express";
import { z } from "zod";
import {
  getSmtpConfig,
  listSmtpConfigs,
  upsertSmtpConfig,
  updateLastTestResult,
  type PersistedSmtpConfig,
} from "../dao/smtpDao";
import {
  assertHostNotPrivateOrLocal,
  validateSmtpInput,
  validateTestRecipientEmail,
} from "../lib/ssrfGuard";
import { sendTestEmail } from "../lib/smtp";

const router = Router();

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

const buildDefaultResponse = (tenantId: string) => ({
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

router.get("/tenants/:tenantId/smtp-config", async (req, res) => {
  const tenantId = (req.params.tenantId || "").trim();
  if (!tenantId) {
    return res.status(400).json({ message: "tenantId 파라미터가 필요합니다." });
  }
  const config = await getSmtpConfig(tenantId);
  if (!config) {
    return res.json(buildDefaultResponse(tenantId));
  }
  return res.json(toResponsePayload(config));
});

router.get("/smtp-configs", async (_req, res) => {
  const configs = await listSmtpConfigs();
  const summaries = configs.map((config) => ({
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
  return res.json(summaries);
});

router.put("/tenants/:tenantId/smtp-config", async (req, res) => {
  try {
    const tenantId = (req.params.tenantId || "").trim();
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId 파라미터가 필요합니다." });
    }

    const parsed = updateSchema.parse(req.body);
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
      tenantId,
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

    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "입력값을 확인하세요.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return res.status(400).json({
      message: error instanceof Error ? error.message : "SMTP 설정 저장 중 오류가 발생했습니다.",
    });
  }
});

router.post("/tenants/:tenantId/smtp-config/test", async (req, res) => {
  let recipientEmail: string | null = null;
  try {
    const tenantId = (req.params.tenantId || "").trim();
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId 파라미터가 필요합니다." });
    }

    const body = testSchema.parse(req.body);
    const config = await getSmtpConfig(tenantId);
    if (!config) {
      return res.status(404).json({ message: "SMTP 설정이 존재하지 않습니다." });
    }

    const fallbackDomains = (config.allowedRecipientDomains ?? []).map((domain) =>
      domain.trim().toLowerCase(),
    );
    if (fallbackDomains.length === 0 && config.fromEmail?.includes("@")) {
      const [, fromDomain = ""] = config.fromEmail.split("@");
      if (fromDomain.trim()) {
        fallbackDomains.push(fromDomain.trim().toLowerCase());
      }
    }

    const normalizedRecipient = validateTestRecipientEmail(body.testRecipientEmail, fallbackDomains);
    recipientEmail = normalizedRecipient;

    if (!config.isActive) {
      return res.status(409).json({ message: "SMTP 설정이 비활성화되어 있습니다." });
    }

    if (!config.password) {
      return res.status(400).json({ message: "SMTP 비밀번호가 설정되어 있지 않습니다." });
    }

    const normalized = validateSmtpInput({
      host: config.host,
      port: config.port,
      securityMode: config.securityMode,
    });
    if (normalized.port !== 465 && normalized.port !== 587) {
      return res.status(400).json({
        message: "테스트 발송은 465 또는 587 포트에서만 지원됩니다.",
      });
    }
    await assertHostNotPrivateOrLocal(normalized.host);

    const passwordSample = config.password ?? "";
    console.log("[SMTP_TEST_DEBUG]", {
      tenantId,
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
      tenantId,
      success: true,
      errorMessage: null,
    });

    return res.json({ ok: true, message: "테스트 메일을 발송했습니다." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "입력값을 확인하세요.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    const tenantId = (req.params.tenantId || "").trim();
    const config = tenantId ? await getSmtpConfig(tenantId) : null;

    const sanitizedMessage =
      config && error instanceof Error
        ? sanitizeErrorMessage(error.message, config)
        : "SMTP 테스트 중 오류가 발생했습니다.";

    if (tenantId) {
      await updateLastTestResult({
        tenantId,
        success: false,
        errorMessage: sanitizedMessage,
      });
    }

    const rawCode =
      (error as any)?.responseCode || (error as any)?.code || (error as any)?.errno || null;
    const shouldLogStack = process.env.NODE_ENV !== "production";
    const errorLog: Record<string, unknown> = {
      tenantId,
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

    return res.status(400).json({ message: userMessage });
  }
});

export const adminSmtpConfigRouter = router;
