import {
  constants,
  createPublicKey,
  verify as verifySignature,
  type JsonWebKey as NodeJsonWebKey,
} from "node:crypto";
import { getOidcConfig } from "./config";
import type { OidcDiscovery, OidcIdTokenClaims, OidcTokenResponse } from "./types";

type Jwk = NodeJsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
  kty?: string;
};

type JwksDocument = {
  keys?: Jwk[];
};

const DISCOVERY_CACHE_TTL_MS = 1000 * 60 * 5;
const JWKS_CACHE_TTL_MS = 1000 * 60 * 5;

let discoveryCache:
  | {
      value: OidcDiscovery;
      expiresAt: number;
    }
  | null = null;

const jwksCache = new Map<
  string,
  {
    keys: Jwk[];
    expiresAt: number;
  }
>();

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const parseJson = async <T>(response: Response) => {
  const text = await response.text();
  if (!text) {
    throw new Error("빈 응답을 수신했습니다.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("JSON 파싱에 실패했습니다.");
  }
};

const fetchJson = async <T>(url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[oidc] 요청 실패: ${url} (${response.status}) ${errorText.slice(0, 240)}`,
    );
  }

  return parseJson<T>(response);
};

const normalizeDiscovery = (input: Partial<OidcDiscovery>): OidcDiscovery => {
  const discovery: OidcDiscovery = {
    issuer: String(input.issuer ?? ""),
    authorization_endpoint: String(input.authorization_endpoint ?? ""),
    token_endpoint: String(input.token_endpoint ?? ""),
    userinfo_endpoint: input.userinfo_endpoint,
    jwks_uri: String(input.jwks_uri ?? ""),
  };

  if (
    !discovery.issuer ||
    !discovery.authorization_endpoint ||
    !discovery.token_endpoint ||
    !discovery.jwks_uri
  ) {
    throw new Error("[oidc] discovery 응답 필수 항목이 누락되었습니다.");
  }

  return discovery;
};

export async function getOidcDiscovery(forceRefresh = false): Promise<OidcDiscovery> {
  if (!forceRefresh && discoveryCache && discoveryCache.expiresAt > Date.now()) {
    return discoveryCache.value;
  }

  const config = getOidcConfig();
  const issuer = trimTrailingSlash(config.issuerUrl);
  const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
  const raw = await fetchJson<Partial<OidcDiscovery>>(discoveryUrl);
  const discovery = normalizeDiscovery(raw);

  discoveryCache = {
    value: discovery,
    expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS,
  };

  return discovery;
}

const getJwks = async (jwksUri: string, forceRefresh = false): Promise<Jwk[]> => {
  const cached = jwksCache.get(jwksUri);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const jwks = await fetchJson<JwksDocument>(jwksUri);
  const keys = Array.isArray(jwks.keys) ? jwks.keys : [];

  if (keys.length === 0) {
    throw new Error("[oidc] JWKS에 서명 키가 없습니다.");
  }

  jwksCache.set(jwksUri, {
    keys,
    expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
  });

  return keys;
};

const decodeJwtPart = <T>(raw: string): T => {
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as T;
};

const parseJwt = (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("[oidc] 잘못된 JWT 형식입니다.");
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error("[oidc] JWT 파트가 누락되었습니다.");
  }

  const header = decodeJwtPart<Record<string, unknown>>(headerPart);
  const payload = decodeJwtPart<OidcIdTokenClaims>(payloadPart);
  const signature = Buffer.from(signaturePart, "base64url");
  const signingInput = `${headerPart}.${payloadPart}`;

  return {
    header,
    payload,
    signature,
    signingInput,
  };
};

const validateAudience = (aud: string | string[], expectedClientId: string) => {
  if (typeof aud === "string") {
    return aud === expectedClientId;
  }
  if (Array.isArray(aud)) {
    return aud.includes(expectedClientId);
  }
  return false;
};

const verifyJwtSignatureWithJwk = (options: {
  alg: string;
  signingInput: string;
  signature: Buffer;
  jwk: Jwk;
}) => {
  const { alg, signingInput, signature, jwk } = options;
  const publicKey = createPublicKey({
    key: jwk,
    format: "jwk",
  });

  if (alg === "RS256") {
    return verifySignature("RSA-SHA256", Buffer.from(signingInput), publicKey, signature);
  }

  if (alg === "PS256") {
    return verifySignature(
      "sha256",
      Buffer.from(signingInput),
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
      },
      signature,
    );
  }

  throw new Error(`[oidc] 지원하지 않는 ID Token 알고리즘입니다: ${alg}`);
};

export async function verifyIdToken(options: {
  idToken: string;
  expectedNonce: string;
}): Promise<OidcIdTokenClaims> {
  const config = getOidcConfig();
  const discovery = await getOidcDiscovery();
  const { header, payload, signature, signingInput } = parseJwt(options.idToken);

  const kid = String(header.kid ?? "");
  const alg = String(header.alg ?? "");
  if (!kid || !alg) {
    throw new Error("[oidc] ID Token 헤더에 kid/alg가 없습니다.");
  }

  const issuer = trimTrailingSlash(config.issuerUrl);
  if (trimTrailingSlash(String(payload.iss ?? "")) !== issuer) {
    throw new Error("[oidc] ID Token iss 검증에 실패했습니다.");
  }

  if (!validateAudience(payload.aud, config.clientId)) {
    throw new Error("[oidc] ID Token aud 검증에 실패했습니다.");
  }

  if (!payload.exp || Date.now() >= payload.exp * 1000) {
    throw new Error("[oidc] ID Token이 만료되었습니다.");
  }

  if ((payload.nonce ?? "") !== options.expectedNonce) {
    throw new Error("[oidc] ID Token nonce 검증에 실패했습니다.");
  }

  const keys = await getJwks(discovery.jwks_uri);
  const key = keys.find((candidate) => candidate.kid === kid);
  if (!key) {
    const refreshedKeys = await getJwks(discovery.jwks_uri, true);
    const refreshedKey = refreshedKeys.find((candidate) => candidate.kid === kid);
    if (!refreshedKey) {
      throw new Error("[oidc] kid에 해당하는 JWKS 키를 찾을 수 없습니다.");
    }

    const verified = verifyJwtSignatureWithJwk({
      alg,
      signingInput,
      signature,
      jwk: refreshedKey,
    });

    if (!verified) {
      throw new Error("[oidc] ID Token 서명 검증에 실패했습니다.");
    }

    return payload;
  }

  const verified = verifyJwtSignatureWithJwk({
    alg,
    signingInput,
    signature,
    jwk: key,
  });

  if (!verified) {
    throw new Error("[oidc] ID Token 서명 검증에 실패했습니다.");
  }

  return payload;
}

const parseTokenResponse = (raw: Partial<OidcTokenResponse>): OidcTokenResponse => {
  const token = {
    access_token: String(raw.access_token ?? ""),
    token_type: String(raw.token_type ?? ""),
    expires_in:
      typeof raw.expires_in === "number"
        ? raw.expires_in
        : raw.expires_in
          ? Number(raw.expires_in)
          : undefined,
    refresh_token: raw.refresh_token ? String(raw.refresh_token) : undefined,
    id_token: raw.id_token ? String(raw.id_token) : undefined,
    scope: raw.scope ? String(raw.scope) : undefined,
  } satisfies OidcTokenResponse;

  if (!token.access_token || !token.token_type) {
    throw new Error("[oidc] 토큰 응답에 access_token 또는 token_type이 없습니다.");
  }

  return token;
};

const requestToken = async (body: URLSearchParams) => {
  const config = getOidcConfig();
  const discovery = await getOidcDiscovery();

  const authorization = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authorization}`,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[oidc] token 교환 실패 (${response.status}): ${errorText.slice(0, 240)}`);
  }

  const raw = await parseJson<Partial<OidcTokenResponse>>(response);
  return parseTokenResponse(raw);
};

export async function exchangeAuthorizationCode(code: string, codeVerifier: string) {
  const config = getOidcConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });

  return requestToken(body);
}

export async function refreshAccessToken(refreshToken: string) {
  const config = getOidcConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  });

  return requestToken(body);
}

export async function fetchUserInfo(accessToken: string) {
  const discovery = await getOidcDiscovery();

  if (!discovery.userinfo_endpoint) {
    throw new Error("[oidc] discovery에 userinfo_endpoint가 없습니다.");
  }

  const response = await fetch(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[oidc] userinfo 호출 실패 (${response.status}): ${errorText.slice(0, 240)}`);
  }

  return parseJson<Record<string, unknown>>(response);
}

export async function buildAuthorizationUrl(params: {
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const config = getOidcConfig();
  const discovery = await getOidcDiscovery();

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (config.requireConsent) {
    url.searchParams.set("prompt", "consent");
  }

  return url;
}
