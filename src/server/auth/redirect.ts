const DEFAULT_RETURN_TO = "/";

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_SLASH_PATTERN = /%2f/i;
const ENCODED_BACKSLASH_PATTERN = /%5c/i;

export const getAppOrigin = () => {
  const raw = process.env.APP_BASE_URL;
  if (!raw) {
    throw new Error("[auth] APP_BASE_URL이 필요합니다.");
  }

  return new URL(raw).origin;
};

const hasEncodedSeparators = (value: string) =>
  ENCODED_SLASH_PATTERN.test(value) || ENCODED_BACKSLASH_PATTERN.test(value);

export const normalizeReturnTo = (candidate: string | null | undefined) => {
  if (!candidate) return DEFAULT_RETURN_TO;
  if (CONTROL_CHAR_PATTERN.test(candidate)) return DEFAULT_RETURN_TO;
  if (hasEncodedSeparators(candidate)) return DEFAULT_RETURN_TO;
  if (!candidate.startsWith("/")) return DEFAULT_RETURN_TO;
  if (candidate.startsWith("//")) return DEFAULT_RETURN_TO;
  if (candidate.includes("\\")) return DEFAULT_RETURN_TO;
  if (candidate.startsWith("/api/auth")) return DEFAULT_RETURN_TO;
  return candidate;
};

export const buildReturnUrl = (candidate: string | null | undefined) => {
  const normalized = normalizeReturnTo(candidate) || DEFAULT_RETURN_TO;
  return new URL(normalized, getAppOrigin()).toString();
};
