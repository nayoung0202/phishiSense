import { describe, expect, it } from "vitest";
import {
  estimateTemplateAiCredits,
  findUnsafeTemplateHtmlIssues,
  templateAiCandidateSchema,
  templateAiRequestSchema,
} from "@shared/templateAi";
import { buildTemplateAiPrompt } from "./templateAi";

describe("templateAi helpers", () => {
  it("요청 조건이 길고 후보 수가 많을수록 예상 크레딧이 증가한다", () => {
    const low = estimateTemplateAiCredits({
      topic: "배송",
      tone: "안내형",
      difficulty: "쉬움",
      prompt: "",
      candidateCount: 1,
    });
    const high = estimateTemplateAiCredits({
      topic: "계정 보안",
      tone: "긴급 요청형",
      difficulty: "어려움",
      prompt:
        "사내 계정 보안 공지처럼 보이도록 하고 로그인 재확인과 제출 안내 문구를 더 구체적으로 넣어 주세요.",
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

    expect(issues).toContain("script 태그는 사용할 수 없습니다.");
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
      customTopic: "",
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

  it("기타 주제를 선택하면 customTopic을 필수로 검증한다", () => {
    expect(() =>
      templateAiRequestSchema.parse({
        topic: "other",
        customTopic: "",
        tone: "informational",
        difficulty: "medium",
        prompt: "",
        generateCount: 4,
        preservedCandidates: [],
      }),
    ).toThrow("기타를 선택한 경우 주제를 직접 입력해 주세요.");
  });

  it("기타 주제 입력값을 프롬프트에 반영한다", () => {
    const prompt = buildTemplateAiPrompt({
      topic: "other",
      customTopic: "사내 행사 안내",
      tone: "informational",
      difficulty: "medium",
      prompt: "행사 신청을 독려하는 문구를 넣어 주세요.",
      generateCount: 2,
      preservedCandidates: [],
    });

    expect(prompt).toContain("- topic: 사내 행사 안내");
    expect(prompt).toContain("- tone: 안내형");
    expect(prompt).toContain("- difficulty: 보통");
  });

  it("프롬프트는 배송 재확인형 레퍼런스 HTML을 포함한다", () => {
    const prompt = buildTemplateAiPrompt({
      topic: "shipping",
      customTopic: "",
      tone: "formal",
      difficulty: "medium",
      prompt: "배송 실패 안내처럼 보이게 해 주세요.",
      generateCount: 2,
      preservedCandidates: [],
    });

    expect(prompt).toContain("Reference mail-body HTML shape:");
    expect(prompt).toContain('href="{{LANDING_URL}}"');
    expect(prompt).toContain("Reference malicious-page HTML shape:");
    expect(prompt).toContain('action="{{TRAINING_URL}}"');
    expect(prompt).toContain('href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer"');
    expect(prompt).toContain("visible anchor link that points to {{TRAINING_URL}}");
    expect(prompt).toContain("display:flex;justify-content:center;padding:48px 24px;background:#f3f4f6");
    expect(prompt).toContain("Do not render the malicious page as a fixed-position modal, dialog, or overlay.");
    expect(prompt).toContain("Do not copy the reference verbatim");
  });
});
