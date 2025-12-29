import crypto from "node:crypto";
import process from "node:process";
import { Client } from "pg";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const printUsage = () => {
  console.log(
    [
      "사용법:",
      "  SMTP_SECRET_OLD=... SMTP_SECRET_NEW=... node scripts/rotate-smtp-secret.mjs [--tenant-id <id>] [--dry-run]",
      "",
      "옵션:",
      "  --tenant-id <id>  특정 테넌트만 재암호화",
      "  --dry-run         실제 업데이트 없이 대상 건수만 확인",
    ].join("\n"),
  );
};

const args = process.argv.slice(2);
let tenantId = null;
let dryRun = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--tenant-id" || arg === "--tenant") {
    tenantId = args[i + 1] ?? null;
    i += 1;
    continue;
  }
  if (arg === "--dry-run") {
    dryRun = true;
    continue;
  }
  if (arg === "--help" || arg === "-h") {
    printUsage();
    process.exit(0);
  }
  console.error(`[rotate-smtp-secret] 알 수 없는 인자: ${arg}`);
  printUsage();
  process.exit(1);
}

if (tenantId === "") {
  console.error("[rotate-smtp-secret] tenant-id 값이 비어 있습니다.");
  process.exit(1);
}

const oldSecret = process.env.SMTP_SECRET_OLD ?? "";
const newSecret = process.env.SMTP_SECRET_NEW ?? "";

if (!oldSecret || !newSecret) {
  console.error("[rotate-smtp-secret] SMTP_SECRET_OLD와 SMTP_SECRET_NEW를 모두 설정해야 합니다.");
  printUsage();
  process.exit(1);
}

if (oldSecret === newSecret) {
  console.warn("[rotate-smtp-secret] 기존 키와 신규 키가 동일합니다. 동일 키 재암호화를 진행합니다.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[rotate-smtp-secret] DATABASE_URL이 설정되지 않았습니다.");
  process.exit(1);
}

const deriveKey = (secret) => crypto.createHash("sha256").update(secret).digest();

const encryptSecret = (raw, secret) => {
  const secretKey = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

const decryptSecret = (payload, secret) => {
  const [ivHex, tagHex, dataHex] = String(payload || "").split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("암호화된 비밀번호 형식이 올바르지 않습니다.");
  }
  const secretKey = deriveKey(secret);
  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

const client = new Client({ connectionString: databaseUrl });

const fetchRows = async () => {
  if (tenantId) {
    const result = await client.query(
      "SELECT id, password_enc FROM smtp_accounts WHERE id = $1",
      [tenantId],
    );
    return result.rows;
  }
  const result = await client.query("SELECT id, password_enc FROM smtp_accounts");
  return result.rows;
};

const updatePassword = async (id, passwordEnc) =>
  client.query(
    "UPDATE smtp_accounts SET password_enc = $1, updated_at = NOW() WHERE id = $2",
    [passwordEnc, id],
  );

const run = async () => {
  await client.connect();
  try {
    const rows = await fetchRows();

    if (rows.length === 0) {
      console.log("[rotate-smtp-secret] 대상 SMTP 설정이 없습니다.");
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    if (!dryRun) {
      await client.query("BEGIN");
    }

    for (const row of rows) {
      const encrypted = row.password_enc;
      if (!encrypted) {
        skippedCount += 1;
        continue;
      }
      let decrypted;
      try {
        decrypted = decryptSecret(encrypted, oldSecret);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "알 수 없는 오류로 복호화에 실패했습니다.";
        throw new Error(`tenantId=${row.id} 비밀번호 복호화 실패: ${message}`);
      }
      const reEncrypted = encryptSecret(decrypted, newSecret);
      if (!dryRun) {
        await updatePassword(row.id, reEncrypted);
      }
      updatedCount += 1;
    }

    if (!dryRun) {
      await client.query("COMMIT");
    }

    const dryRunLabel = dryRun ? " (dry-run)" : "";
    console.log(
      `[rotate-smtp-secret] 완료${dryRunLabel}: 업데이트 ${updatedCount}건, 스킵 ${skippedCount}건`,
    );
  } catch (error) {
    if (!dryRun) {
      try {
        await client.query("ROLLBACK");
      } catch {
      }
    }
    throw error;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error(
    `[rotate-smtp-secret] 재암호화 중 오류가 발생했습니다: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});
