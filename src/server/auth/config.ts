const DEFAULT_ISSUER_URL = "https://auth.evriz.co.kr";
const DEFAULT_CLIENT_ID = "phishsense-app";
const DEFAULT_REDIRECT_URI = "https://app.phishsense.cloud/oidc/callback";
const DEFAULT_SCOPE = "openid profile email offline_access";
const DEFAULT_SESSION_COOKIE_NAME = "ps_session";
const DEFAULT_TXN_COOKIE_NAME = "ps_oidc_txn";
const DEFAULT_IDLE_TTL_SEC = 60 * 60 * 8;
const DEFAULT_ABS_TTL_SEC = 60 * 60 * 24 * 7;

const DEV_FALLBACK_SESSION_SECRET = "dev-auth-session-secret-change-me";
const DEV_FALLBACK_TOKEN_ENC_KEY = "dev-auth-token-enc-key-change-me";

const trim = (value?: string | null) => (value ?? "").trim();

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const isProduction = () => process.env.NODE_ENV === "production";

const requireEnv = (name: string) => {
  const value = trim(process.env[name]);
  if (!value) {
    throw new Error(`[auth] 환경변수 ${name}이(가) 필요합니다.`);
  }
  return value;
};

const getSecretEnv = (name: string, fallback: string) => {
  const value = trim(process.env[name]);
  if (value) return value;
  if (isProduction()) {
    throw new Error(`[auth] 운영 환경에서는 ${name}이(가) 필수입니다.`);
  }
  return fallback;
};

export type OidcConfig = {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  requireConsent: boolean;
};

export type AuthSessionConfig = {
  sessionCookieName: string;
  transactionCookieName: string;
  sessionSecret: string;
  tokenEncryptionKey: string;
  idleTtlSec: number;
  absoluteTtlSec: number;
  secureCookie: boolean;
};

export const normalizeIssuer = (issuer: string) => issuer.replace(/\/+$/, "");

export function getOidcConfig(): OidcConfig {
  const issuerUrl = normalizeIssuer(trim(process.env.OIDC_ISSUER_URL) || DEFAULT_ISSUER_URL);
  const clientId = trim(process.env.OIDC_CLIENT_ID) || DEFAULT_CLIENT_ID;
  const redirectUri = trim(process.env.OIDC_REDIRECT_URI) || DEFAULT_REDIRECT_URI;

  return {
    issuerUrl,
    clientId,
    clientSecret: requireEnv("OIDC_CLIENT_SECRET"),
    redirectUri,
    scope: trim(process.env.OIDC_SCOPE) || DEFAULT_SCOPE,
    requireConsent: parseBoolean(process.env.OIDC_REQUIRE_CONSENT, false),
  };
}

export function getAuthSessionConfig(): AuthSessionConfig {
  return {
    sessionCookieName: trim(process.env.AUTH_SESSION_COOKIE_NAME) || DEFAULT_SESSION_COOKIE_NAME,
    transactionCookieName:
      trim(process.env.AUTH_TRANSACTION_COOKIE_NAME) || DEFAULT_TXN_COOKIE_NAME,
    sessionSecret: getSecretEnv("AUTH_SESSION_SECRET", DEV_FALLBACK_SESSION_SECRET),
    tokenEncryptionKey: getSecretEnv("AUTH_TOKEN_ENC_KEY", DEV_FALLBACK_TOKEN_ENC_KEY),
    idleTtlSec: parsePositiveInt(process.env.AUTH_SESSION_IDLE_TTL_SEC, DEFAULT_IDLE_TTL_SEC),
    absoluteTtlSec: parsePositiveInt(process.env.AUTH_SESSION_ABS_TTL_SEC, DEFAULT_ABS_TTL_SEC),
    secureCookie: isProduction(),
  };
}

export function getSessionCookieName() {
  return trim(process.env.AUTH_SESSION_COOKIE_NAME) || DEFAULT_SESSION_COOKIE_NAME;
}
