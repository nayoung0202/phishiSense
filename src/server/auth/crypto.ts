import crypto from "node:crypto";
import { getAuthSessionConfig } from "./config";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

const getAesKey = () => {
  const { tokenEncryptionKey } = getAuthSessionConfig();
  return crypto.createHash("sha256").update(tokenEncryptionKey).digest();
};

export const createOpaqueSessionId = () => crypto.randomBytes(32).toString("base64url");

export const createPkceVerifier = () => crypto.randomBytes(64).toString("base64url");

export const createRandomParam = () => crypto.randomBytes(32).toString("base64url");

export const createPkceChallenge = (verifier: string) =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

export function encryptAuthToken(raw: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getAesKey(), iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptAuthToken(payload: string): string {
  const [ivHex, tagHex, bodyHex] = payload.split(":");
  if (!ivHex || !tagHex || !bodyHex) {
    return "";
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getAesKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(bodyHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
