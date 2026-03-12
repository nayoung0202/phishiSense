import { describe, expect, it } from "vitest";
import {
  estimateTemplateAiCredits,
  findUnsafeTemplateHtmlIssues,
} from "@shared/templateAi";

describe("templateAi helpers", () => {
  it("increases estimated credits when prompt and candidate count grow", () => {
    const low = estimateTemplateAiCredits({
      topic: "shipping",
      tone: "informational",
      difficulty: "easy",
      prompt: "",
      candidateCount: 1,
    });
    const high = estimateTemplateAiCredits({
      topic: "account-security",
      tone: "urgent-request",
      difficulty: "hard",
      prompt:
        "Reflect an internal identity system update and make the copy more convincing and more specific.",
      candidateCount: 4,
    });

    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
  });

  it("detects external resources and scripts", () => {
    const issues = findUnsafeTemplateHtmlIssues(`
      <script>alert(1)</script>
      <img src="https://example.com/a.png" />
      <a href="javascript:alert(1)">click</a>
    `);

    expect(issues).toContain("Script tags are not allowed.");
    expect(issues).toContain("External resource URLs are not allowed.");
    expect(issues).toContain("javascript: URLs are not allowed.");
  });
});
