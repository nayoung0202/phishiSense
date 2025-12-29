import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEV_FALLBACK_SECRET = "dev-only-smtp-secret";

const resolveSecret = () => process.env.SMTP_SECRET || DEV_FALLBACK_SECRET;

export const hasSmtpSecret = () => Boolean(process.env.SMTP_SECRET);

export function encryptSecret(raw: string): string {
  const secretKey = crypto.createHash("sha256").update(resolveSecret()).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    return "";
  }
  const secretKey = crypto.createHash("sha256").update(resolveSecret()).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
