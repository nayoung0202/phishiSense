import { describe, expect, it } from "vitest";
import {
  estimateTemplateAiCredits,
  findUnsafeTemplateHtmlIssues,
  templateAiCandidateSchema,
  templateAiRequestSchema,
} from "@shared/templateAi";

describe("templateAi helpers", () => {
  it("프롬프트가 길고 후보 수가 많을수록 예상 크레딧이 증가한다", () => {
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
        "사내 계정 점검 공지처럼 보이도록 하고 내부 시스템명과 제출 안내 문구를 더 구체적으로 반영해 주세요.",
      candidateCount: 4,
    });

    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
  });

  it("외부 리소스와 스크립트 사용을 차단한다", () => {
    const issues = findUnsafeTemplateHtmlIssues(`
      <script>alert(1)</script>
      <img src="https://example.com/a.png" />
      <a href="javascript:alert(1)">click</a>
    `);

    expect(issues).toContain("스크립트 태그는 사용할 수 없습니다.");
    expect(issues).toContain("외부 리소스 URL은 사용할 수 없습니다.");
    expect(issues).toContain("javascript: URL은 사용할 수 없습니다.");
  });

  it("style 태그가 포함된 후보 스키마를 name 없이 파싱한다", () => {
    const candidate = templateAiCandidateSchema.parse({
      id: "candidate-1",
      subject: "급여 명세서 확인 안내",
      body: '<style>body{font-family:sans-serif;}</style><a href="{{LANDING_URL}}">확인</a>',
      maliciousPageContent:
        '<style>form{display:grid;gap:12px;}</style><form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">제출</button></form>',
      summary: "급여 공지형 후보",
    });

    expect(candidate.subject).toBe("급여 명세서 확인 안내");
    expect(candidate).not.toHaveProperty("name");
  });

  it("preservedCandidates는 subject만 있으면 통과한다", () => {
    const payload = templateAiRequestSchema.parse({
      topic: "shipping",
      tone: "formal",
      difficulty: "medium",
      prompt: "",
      generateCount: 3,
      preservedCandidates: [{ id: "keep-1", subject: "배송 일정 재확인 요청" }],
    });

    expect(payload.preservedCandidates).toEqual([
      { id: "keep-1", subject: "배송 일정 재확인 요청" },
    ]);
  });
});
