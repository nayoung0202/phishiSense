import process from "node:process";
import type { Project } from "@shared/schema";
import type { PersistedSmtpConfig } from "../dao/smtpDao";
import { findMissingSmtpKey, normalizeOptionalString } from "./projectsShared";

export type RuntimeSendConfigIssueCode =
  | "smtp_not_configured"
  | "smtp_inactive"
  | "smtp_password_missing"
  | "sender_name_missing"
  | "sender_email_missing"
  | "sender_email_invalid";

export type RuntimeSendConfigIssue = {
  code: RuntimeSendConfigIssueCode;
  message: string;
};

export type RuntimeTransportConfig = {
  source: "tenant" | "env";
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
  user: string | null;
  pass: string | null;
  allowInvalidTls: boolean;
  replyTo: string | null;
};

export type RuntimeSenderInfo = {
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
};

export type RuntimeSendConfig = {
  transport: RuntimeTransportConfig;
  sender: RuntimeSenderInfo;
};

const extractErrorCodeFromMessage = (message: string) => {
  const statusMatch = message.match(/\b(5\d{2})\b/);
  if (statusMatch) {
    return statusMatch[1];
  }

  const codeMatch = message.match(/\b(E[A-Z_]+)\b/);
  return codeMatch ? codeMatch[1].toUpperCase() : null;
};

const hasSecretValue = (value?: string | null) => typeof value === "string" && value.length > 0;

const readOptionalSecret = (value?: string | null) => (typeof value === "string" ? value : null);

const resolveEnvTransportConfig = (): RuntimeTransportConfig => ({
  source: "env",
  host: normalizeOptionalString(process.env.SMTP_HOST) ?? "",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: normalizeOptionalString(process.env.SMTP_SECURE)?.toLowerCase() === "true",
  user: normalizeOptionalString(process.env.SMTP_USER),
  pass: readOptionalSecret(process.env.SMTP_PASS),
  allowInvalidTls:
    normalizeOptionalString(process.env.SMTP_ALLOW_INVALID_TLS)?.toLowerCase() === "true",
  replyTo: null,
});

const resolveTenantTransportConfig = (smtpConfig: PersistedSmtpConfig): RuntimeTransportConfig => ({
  source: "tenant",
  host: normalizeOptionalString(smtpConfig.host) ?? "",
  port: Number(smtpConfig.port ?? 587),
  secure: smtpConfig.securityMode === "SMTPS",
  requireTLS: smtpConfig.securityMode === "STARTTLS",
  user: normalizeOptionalString(smtpConfig.username),
  pass: readOptionalSecret(smtpConfig.password),
  allowInvalidTls: smtpConfig.tlsVerify === false,
  replyTo: normalizeOptionalString(smtpConfig.replyTo),
});

export const collectRuntimeSendConfigIssues = (
  project: Pick<Project, "fromName" | "fromEmail">,
  smtpConfig?: PersistedSmtpConfig | null,
): RuntimeSendConfigIssue[] => {
  const issues: RuntimeSendConfigIssue[] = [];

  if (smtpConfig) {
    if (!smtpConfig.isActive) {
      issues.push({
        code: "smtp_inactive",
        message: "테넌트 SMTP 설정이 비활성화되어 프로젝트 메일을 발송할 수 없습니다.",
      });
    }

    if (normalizeOptionalString(smtpConfig.username) && !hasSecretValue(smtpConfig.password)) {
      issues.push({
        code: "smtp_password_missing",
        message: "테넌트 SMTP 비밀번호가 설정되지 않아 프로젝트 메일을 발송할 수 없습니다.",
      });
    }
  } else {
    const missingSmtpKey = findMissingSmtpKey();
    if (missingSmtpKey) {
      issues.push({
        code: "smtp_not_configured",
        message: `${missingSmtpKey} 환경 변수가 누락되어 프로젝트 메일을 발송할 수 없습니다.`,
      });
    }
  }

  const fromName =
    normalizeOptionalString(project.fromName) ||
    normalizeOptionalString(smtpConfig?.fromName) ||
    normalizeOptionalString(process.env.MAIL_FROM_NAME);
  if (!fromName) {
    issues.push({
      code: "sender_name_missing",
      message: "프로젝트 발신자 이름, 테넌트 SMTP 발신자 이름 또는 MAIL_FROM_NAME 환경 변수가 필요합니다.",
    });
  }

  const fromEmail =
    normalizeOptionalString(project.fromEmail) ||
    normalizeOptionalString(smtpConfig?.fromEmail) ||
    normalizeOptionalString(process.env.MAIL_FROM_EMAIL);
  if (!fromEmail) {
    issues.push({
      code: "sender_email_missing",
      message:
        "프로젝트 발신 이메일, 테넌트 SMTP 발신 이메일 또는 MAIL_FROM_EMAIL 환경 변수가 필요합니다.",
    });
  } else if (!fromEmail.includes("@")) {
    issues.push({
      code: "sender_email_invalid",
      message:
        "프로젝트 발신 이메일, 테넌트 SMTP 발신 이메일 또는 MAIL_FROM_EMAIL 환경 변수 형식이 올바르지 않습니다.",
    });
  }

  return issues;
};

export const resolveRuntimeSendConfig = (
  project: Pick<Project, "fromName" | "fromEmail">,
  smtpConfig?: PersistedSmtpConfig | null,
): RuntimeSendConfig => {
  const issues = collectRuntimeSendConfigIssues(project, smtpConfig);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join("\n"));
  }

  const transport = smtpConfig ? resolveTenantTransportConfig(smtpConfig) : resolveEnvTransportConfig();
  const fromName =
    normalizeOptionalString(project.fromName) ||
    normalizeOptionalString(smtpConfig?.fromName) ||
    normalizeOptionalString(process.env.MAIL_FROM_NAME);
  const fromEmail =
    normalizeOptionalString(project.fromEmail) ||
    normalizeOptionalString(smtpConfig?.fromEmail) ||
    normalizeOptionalString(process.env.MAIL_FROM_EMAIL);

  return {
    transport,
    sender: {
      fromName: fromName ?? "",
      fromEmail: fromEmail ?? "",
      replyTo: transport.replyTo,
    },
  };
};

export const formatRuntimeSendError = (
  error: unknown,
  options?: { senderEmail?: string | null; transportSource?: RuntimeTransportConfig["source"] },
) => {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "알 수 없는 오류";
  const code =
    (typeof error === "object" &&
      error !== null &&
      "responseCode" in error &&
      typeof (error as { responseCode?: unknown }).responseCode !== "undefined" &&
      String((error as { responseCode?: unknown }).responseCode)) ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code !== "undefined" &&
      String((error as { code?: unknown }).code).toUpperCase()) ||
    extractErrorCodeFromMessage(raw);

  if (code === "551" || /not authorised to send from this header address/i.test(raw)) {
    const sender = options?.senderEmail ? ` (${options.senderEmail})` : "";
    const source = options?.transportSource === "tenant" ? "테넌트 SMTP 설정" : "환경 변수 SMTP 설정";
    return `${source}으로 발신 주소${sender} 사용이 거부되었습니다. 프로젝트 발신 이메일과 SMTP 계정의 send-as/alias 권한을 확인하세요. 원본 응답: ${raw}`;
  }

  if (code === "535" || code === "EAUTH") {
    return "SMTP 서버 인증에 실패했습니다. 사용자명, 비밀번호 또는 앱 비밀번호를 확인하세요.";
  }

  if (
    code === "ETIMEDOUT" ||
    code === "ECONNECTION" ||
    code === "ECONNREFUSED" ||
    code === "ENETUNREACH" ||
    code === "EHOSTUNREACH"
  ) {
    return "SMTP 서버 연결에 실패했습니다. 호스트, 포트, TLS 설정을 확인하세요.";
  }

  return raw;
};
