export type SmtpErrorStage = "verify" | "send" | "unknown";
export type SmtpErrorClass = "4xx" | "5xx" | null;
export type SmtpErrorCategory =
  | "auth"
  | "network"
  | "sender_rejected"
  | "temporary"
  | "permanent"
  | "unknown";

export type NormalizedSmtpError = {
  message: string;
  rawMessage: string;
  providerCode: string | null;
  smtpCode: string | null;
  smtpClass: SmtpErrorClass;
  category: SmtpErrorCategory;
  retryable: boolean;
  stage: SmtpErrorStage;
  httpStatus: number;
};

type SmtpErrorLike = {
  message?: unknown;
  responseCode?: unknown;
  code?: unknown;
  errno?: unknown;
  stage?: unknown;
};

const SMTP_STATUS_REGEX = /\b([45]\d{2})\b/;
const SYMBOLIC_CODE_REGEX = /\b(E[A-Z_]+)\b/;
const NETWORK_CODES = new Set([
  "ECONNECTION",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ETIMEDOUT",
]);

const toProviderCode = (value: unknown) => {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim().toUpperCase() || null;
  return null;
};

const extractSmtpCode = (rawMessage: string, providerCode: string | null) => {
  if (providerCode && /^[45]\d{2}$/.test(providerCode)) {
    return providerCode;
  }
  const match = rawMessage.match(SMTP_STATUS_REGEX);
  return match ? match[1] : null;
};

const extractSymbolicCode = (rawMessage: string) => {
  const match = rawMessage.match(SYMBOLIC_CODE_REGEX);
  return match ? match[1].toUpperCase() : null;
};

const inferStage = (error: unknown): SmtpErrorStage => {
  if (
    typeof error === "object" &&
    error !== null &&
    "stage" in error &&
    typeof (error as SmtpErrorLike).stage === "string"
  ) {
    const stage = (error as SmtpErrorLike).stage as string;
    if (stage === "verify" || stage === "send") return stage;
  }
  return "unknown";
};

const resolveStageMessage = (stage: SmtpErrorStage, type: "temporary" | "permanent") => {
  if (type === "temporary") {
    return stage === "verify"
      ? "SMTP 서버가 연결 또는 인증 요청을 일시적으로 처리하지 못했습니다. 잠시 후 다시 시도하세요."
      : "SMTP 서버가 메일 전송 요청을 일시적으로 처리하지 못했습니다. 잠시 후 다시 시도하세요.";
  }

  return stage === "verify"
    ? "SMTP 서버가 연결 또는 인증 요청을 거부했습니다. 계정 정보와 서버 정책을 확인하세요."
    : "SMTP 서버가 메일 전송 요청을 거부했습니다. 발신 이메일, 수신 이메일, 서버 정책을 확인하세요.";
};

export class SmtpStageError extends Error {
  stage: SmtpErrorStage;
  responseCode?: unknown;
  code?: unknown;
  errno?: unknown;

  constructor(stage: Exclude<SmtpErrorStage, "unknown">, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause ?? "SMTP operation failed"));
    this.name = "SmtpStageError";
    this.stage = stage;

    if (cause instanceof Error && cause.stack) {
      this.stack = cause.stack;
    }

    if (typeof cause === "object" && cause !== null) {
      const typed = cause as SmtpErrorLike;
      this.responseCode = typed.responseCode;
      this.code = typed.code;
      this.errno = typed.errno;
    }
  }
}

export const withSmtpStage = (
  stage: Exclude<SmtpErrorStage, "unknown">,
  error: unknown,
) => {
  return error instanceof SmtpStageError ? error : new SmtpStageError(stage, error);
};

export const normalizeSmtpError = (
  error: unknown,
  options?: {
    rawMessage?: string;
    senderEmail?: string | null;
  },
): NormalizedSmtpError => {
  const rawMessage =
    options?.rawMessage ||
    (error instanceof Error ? error.message : typeof error === "string" ? error : "알 수 없는 SMTP 오류");
  const typed = (typeof error === "object" && error !== null ? error : null) as SmtpErrorLike | null;
  const providerCode =
    toProviderCode(typed?.responseCode) ||
    toProviderCode(typed?.code) ||
    toProviderCode(typed?.errno) ||
    extractSymbolicCode(rawMessage);
  const smtpCode = extractSmtpCode(rawMessage, providerCode);
  const smtpClass: SmtpErrorClass =
    smtpCode?.startsWith("4") ? "4xx" : smtpCode?.startsWith("5") ? "5xx" : null;
  const stage = inferStage(error);
  const senderLabel = options?.senderEmail ? ` (${options.senderEmail})` : "";

  if (smtpCode === "551" || /not authorised to send from this header address/i.test(rawMessage)) {
    return {
      message: `입력한 발신 이메일${senderLabel} 사용 권한이 없습니다. SMTP 계정의 send-as/alias 권한을 확인하세요.`,
      rawMessage,
      providerCode,
      smtpCode,
      smtpClass: "5xx",
      category: "sender_rejected",
      retryable: false,
      stage,
      httpStatus: 400,
    };
  }

  if (providerCode === "535" || providerCode === "EAUTH") {
    return {
      message: "SMTP 서버 인증에 실패했습니다. 계정, 비밀번호 또는 앱 비밀번호를 확인하세요.",
      rawMessage,
      providerCode,
      smtpCode,
      smtpClass,
      category: "auth",
      retryable: false,
      stage,
      httpStatus: 400,
    };
  }

  if (providerCode && NETWORK_CODES.has(providerCode)) {
    return {
      message: "SMTP 서버 연결에 실패했습니다. 호스트, 포트, TLS 설정을 확인하세요.",
      rawMessage,
      providerCode,
      smtpCode,
      smtpClass,
      category: "network",
      retryable: true,
      stage,
      httpStatus: providerCode === "ETIMEDOUT" ? 504 : 502,
    };
  }

  if (smtpClass === "4xx") {
    return {
      message: resolveStageMessage(stage, "temporary"),
      rawMessage,
      providerCode,
      smtpCode,
      smtpClass,
      category: "temporary",
      retryable: true,
      stage,
      httpStatus: 502,
    };
  }

  if (smtpClass === "5xx") {
    return {
      message: resolveStageMessage(stage, "permanent"),
      rawMessage,
      providerCode,
      smtpCode,
      smtpClass,
      category: "permanent",
      retryable: false,
      stage,
      httpStatus: 400,
    };
  }

  return {
    message: rawMessage,
    rawMessage,
    providerCode,
    smtpCode,
    smtpClass,
    category: "unknown",
    retryable: false,
    stage,
    httpStatus: 400,
  };
};
