const DEFAULT_CALLBACK_TOLERANCE_SEC = 60 * 5;

const trim = (value?: string | null) => (value ?? "").trim();

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const requireEnv = (name: string) => {
  const value = trim(process.env[name]);
  if (!value) {
    throw new Error(`[platform] 환경변수 ${name}이(가) 필요합니다.`);
  }
  return value;
};

export function getPlatformClientConfig() {
  const baseUrl = normalizeBaseUrl(requireEnv("PLATFORM_API_BASE_URL"));

  return {
    baseUrl,
  };
}

export function getPlatformCallbackConfig() {
  return {
    keyId: requireEnv("PHISHSENSE_CALLBACK_KEY_ID"),
    secret: requireEnv("PHISHSENSE_CALLBACK_SECRET"),
    toleranceSec: parsePositiveInt(
      process.env.PLATFORM_CALLBACK_TOLERANCE_SEC,
      DEFAULT_CALLBACK_TOLERANCE_SEC,
    ),
  };
}
