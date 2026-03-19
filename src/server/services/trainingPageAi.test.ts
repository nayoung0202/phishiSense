import { describe, expect, it } from "vitest";
import { trainingPageAiRequestSchema } from "@shared/trainingPageAi";
import { buildTrainingPageAiPrompt } from "./trainingPageAi";

describe("trainingPageAi helpers", () => {
  it("기타 주제를 선택하면 customTopic을 필수로 검증한다", () => {
    expect(() =>
      trainingPageAiRequestSchema.parse({
      topic: "other",
      customTopic: "",
      prompt: "",
      generateCount: 4,
      preservedCandidates: [],
      }),
    ).toThrow("기타를 선택한 경우 주제를 직접 입력해 주세요.");
  });

  it("프롬프트가 참고 첨부 우선 규칙과 주제별 필수 안전 안내를 포함한다", () => {
    const prompt = buildTrainingPageAiPrompt({
      topic: "account-security",
      customTopic: "",
      prompt: "계정 잠금 해제보다 주소 확인 안내를 더 강조해 주세요.",
      generateCount: 2,
      preservedCandidates: [],
      referenceAttachment: {
        name: "training-reference.html",
        mimeType: "text/html",
        kind: "html",
        textContent: "<div>훈련안내 참고 레이아웃</div>",
      },
    });

    expect(prompt).toContain("that attachment is the primary basis for the output");
    expect(prompt).toContain("prioritize it over the built-in reference HTML");
    expect(prompt).toContain("Do not include links, anchor tags, buttons");
    expect(prompt).toContain("scenario label: 계정 보안");
    expect(prompt).toContain("메일 링크 대신 공식 사이트 또는 공식 앱에 직접 접속해 확인하라고 반드시 안내합니다.");
    expect(prompt).toContain("extra requirements: 계정 잠금 해제보다 주소 확인 안내를 더 강조해 주세요.");
    expect(prompt).toContain("{{SUBMIT_URL}} is not required for training-page output.");
    expect(prompt).toContain("training-reference.html");
    expect(prompt).toContain("<div>훈련안내 참고 레이아웃</div>");
  });
});
