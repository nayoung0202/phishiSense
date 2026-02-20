import { createHmac } from "node:crypto";
import { getAuthSessionConfig } from "./config";
import type { OidcAuthTransaction } from "./types";

const MAX_TRANSACTION_AGE_MS = 1000 * 60 * 10;

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
};

const signPayload = (payloadBase64: string) => {
  const { sessionSecret } = getAuthSessionConfig();
  return createHmac("sha256", sessionSecret).update(payloadBase64).digest("base64url");
};

export const normalizeReturnTo = (candidate: string | null | undefined) => {
  if (!candidate) return "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  if (candidate.startsWith("/api/auth")) return "/";
  return candidate;
};

export function encodeOidcTransaction(transaction: OidcAuthTransaction): string {
  const payloadBase64 = Buffer.from(JSON.stringify(transaction), "utf8").toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function decodeOidcTransaction(payload: string): OidcAuthTransaction | null {
  const [payloadBase64, signature] = payload.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));

    const createdAt = Number(parsed?.createdAt);
    if (!Number.isFinite(createdAt)) {
      return null;
    }

    if (Date.now() - createdAt > MAX_TRANSACTION_AGE_MS) {
      return null;
    }

    const transaction: OidcAuthTransaction = {
      state: String(parsed?.state ?? ""),
      nonce: String(parsed?.nonce ?? ""),
      codeVerifier: String(parsed?.codeVerifier ?? ""),
      returnTo: normalizeReturnTo(parsed?.returnTo),
      createdAt,
    };

    if (!transaction.state || !transaction.nonce || !transaction.codeVerifier) {
      return null;
    }

    return transaction;
  } catch {
    return null;
  }
}
