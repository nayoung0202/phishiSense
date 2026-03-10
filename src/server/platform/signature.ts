import { createHmac, timingSafeEqual } from "node:crypto";
import { getPlatformCallbackConfig } from "./config";

const SIGNATURE_PREFIX = "sha256=";

export class PlatformCallbackError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const toHexDigest = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

export function assertValidPlatformSignature(input: {
  timestamp: string | null;
  keyId: string | null;
  signature: string | null;
  body: string;
}) {
  const { keyId, secret, toleranceSec } = getPlatformCallbackConfig();

  if (!input.timestamp) {
    throw new PlatformCallbackError(
      400,
      "missing_timestamp",
      "X-Platform-Timestamp 헤더가 필요합니다.",
    );
  }

  if (!input.keyId) {
    throw new PlatformCallbackError(
      400,
      "missing_key_id",
      "X-Platform-Key-Id 헤더가 필요합니다.",
    );
  }

  if (input.keyId !== keyId) {
    throw new PlatformCallbackError(
      401,
      "invalid_key_id",
      "허용되지 않은 Platform key id 입니다.",
    );
  }

  if (!input.signature || !input.signature.startsWith(SIGNATURE_PREFIX)) {
    throw new PlatformCallbackError(
      401,
      "invalid_signature_format",
      "X-Platform-Signature 형식이 올바르지 않습니다.",
    );
  }

  const timestampValue = Number(input.timestamp);
  if (!Number.isFinite(timestampValue)) {
    throw new PlatformCallbackError(
      400,
      "invalid_timestamp",
      "X-Platform-Timestamp 값이 올바르지 않습니다.",
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampValue) > toleranceSec) {
    throw new PlatformCallbackError(
      401,
      "timestamp_out_of_range",
      "허용된 timestamp 범위를 벗어났습니다.",
    );
  }

  const signingPayload = `${input.timestamp}\n${input.body}`;
  const expectedHex = toHexDigest(signingPayload, secret);
  const receivedHex = input.signature.slice(SIGNATURE_PREFIX.length);
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const receivedBuffer = Buffer.from(receivedHex, "hex");

  if (
    expectedBuffer.length === 0 ||
    receivedBuffer.length === 0 ||
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new PlatformCallbackError(
      401,
      "signature_mismatch",
      "Platform callback 서명 검증에 실패했습니다.",
    );
  }
}
