import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES } from "./defaultTemplates";

describe("DEFAULT_TEMPLATES", () => {
  it("기본 템플릿 문자열에 깨진 문자가 포함되지 않는다", () => {
    const mergedText = DEFAULT_TEMPLATES.flatMap((template) => [
      template.name,
      template.subject,
      template.body ?? "",
      template.maliciousPageContent ?? "",
      template.autoInsertLandingLabel ?? "",
    ]).join("\n");

    expect(mergedText).not.toMatch(/[筌獄袁癒꺜沃]/);
    expect(mergedText).not.toContain("??");
  });
});
