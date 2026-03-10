import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  assertValidPlatformSignature,
  PlatformCallbackError,
} from "./signature";

const createSignature = (timestamp: string, body: string, secret: string) =>
  `sha256=${createHmac("sha256", secret).update(`${timestamp}\n${body}`).digest("hex")}`;

beforeEach(() => {
  process.env.PHISHSENSE_CALLBACK_KEY_ID = "key-1";
  process.env.PHISHSENSE_CALLBACK_SECRET = "secret-1";
  process.env.PLATFORM_CALLBACK_TOLERANCE_SEC = "300";
});

describe("assertValidPlatformSignature", () => {
  it("정상 signature를 통과시킨다", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ ok: true });

    expect(() =>
      assertValidPlatformSignature({
        timestamp,
        keyId: "key-1",
        signature: createSignature(timestamp, body, "secret-1"),
        body,
      }),
    ).not.toThrow();
  });

  it("key id가 다르면 오류를 던진다", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ ok: true });

    expect(() =>
      assertValidPlatformSignature({
        timestamp,
        keyId: "wrong-key",
        signature: createSignature(timestamp, body, "secret-1"),
        body,
      }),
    ).toThrowError(PlatformCallbackError);
  });

  it("timestamp가 만료되면 오류를 던진다", () => {
    const timestamp = String(Math.floor(Date.now() / 1000) - 600);
    const body = JSON.stringify({ ok: true });

    expect(() =>
      assertValidPlatformSignature({
        timestamp,
        keyId: "key-1",
        signature: createSignature(timestamp, body, "secret-1"),
        body,
      }),
    ).toThrowError(PlatformCallbackError);
  });
});
