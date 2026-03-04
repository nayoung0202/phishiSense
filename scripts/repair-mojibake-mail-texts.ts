import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { templates } from "../src/server/db/schema";
import { DEFAULT_TEMPLATES } from "../src/server/seed/defaultTemplates";

const TARGET_TEMPLATE_IDS = new Set([
  "tmpl-shipping-alert",
  "tmpl-m365-lock",
  "tmpl-tax-refund",
]);

const MOJIBAKE_PATTERN =
  /(?:\?\?|[��]|[筌獄袁癒꺜沃]|[硫붿씪臾몄꽌諛쒖떊蹂몃Ц?섍꼍])/;

type TemplateRecord = {
  id: string;
  name: string;
  subject: string;
  body: string;
  maliciousPageContent: string | null;
  autoInsertLandingLabel: string | null;
};

const hasMojibake = (value: string | null | undefined) => {
  if (!value) return false;
  return MOJIBAKE_PATTERN.test(value);
};

const normalizeValue = (value: string | null | undefined) => value ?? "";

async function repairTemplate(record: TemplateRecord) {
  const expected = DEFAULT_TEMPLATES.find((template) => template.id === record.id);
  if (!expected) return { updated: false, reason: "default_missing" as const };

  const nameNeedsRepair = record.name !== expected.name && hasMojibake(record.name);
  const subjectNeedsRepair = record.subject !== expected.subject && hasMojibake(record.subject);
  const bodyNeedsRepair = record.body !== expected.body && hasMojibake(record.body);
  const maliciousNeedsRepair =
    normalizeValue(record.maliciousPageContent) !== normalizeValue(expected.maliciousPageContent) &&
    hasMojibake(record.maliciousPageContent);
  const labelNeedsRepair =
    normalizeValue(record.autoInsertLandingLabel) !== normalizeValue(expected.autoInsertLandingLabel) &&
    hasMojibake(record.autoInsertLandingLabel);

  const shouldUpdate =
    nameNeedsRepair ||
    subjectNeedsRepair ||
    bodyNeedsRepair ||
    maliciousNeedsRepair ||
    labelNeedsRepair;

  if (!shouldUpdate) {
    return { updated: false, reason: "not_needed" as const };
  }

  await db
    .update(templates)
    .set({
      name: expected.name,
      subject: expected.subject,
      body: expected.body,
      maliciousPageContent: expected.maliciousPageContent ?? "",
      autoInsertLandingLabel: (expected.autoInsertLandingLabel ?? "문서 확인하기").trim(),
      updatedAt: new Date(),
    })
    .where(eq(templates.id, record.id));

  return {
    updated: true,
    details: {
      nameNeedsRepair,
      subjectNeedsRepair,
      bodyNeedsRepair,
      maliciousNeedsRepair,
      labelNeedsRepair,
    },
  };
}

async function main() {
  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      subject: templates.subject,
      body: templates.body,
      maliciousPageContent: templates.maliciousPageContent,
      autoInsertLandingLabel: templates.autoInsertLandingLabel,
    })
    .from(templates);

  const targets = rows.filter((row) => TARGET_TEMPLATE_IDS.has(row.id));

  if (targets.length === 0) {
    console.log("[repair-mojibake] 기본 템플릿 대상이 없어 작업을 종료합니다.");
    return;
  }

  let updatedCount = 0;
  for (const template of targets) {
    const result = await repairTemplate(template);
    if (result.updated) {
      updatedCount += 1;
      console.log(`[repair-mojibake] 복구 완료: ${template.id}`, result.details);
    } else {
      console.log(`[repair-mojibake] 건너뜀: ${template.id} (${result.reason})`);
    }
  }

  console.log(
    `[repair-mojibake] 처리 완료 - 대상 ${targets.length}건 / 복구 ${updatedCount}건 / 유지 ${
      targets.length - updatedCount
    }건`,
  );
}

main().catch((error) => {
  console.error("[repair-mojibake] 실행 실패", error);
  process.exit(1);
});
