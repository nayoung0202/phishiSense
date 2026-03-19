import { describe, expect, it } from "vitest";
import { trainingPageAiRequestSchema } from "@shared/trainingPageAi";
import { buildTrainingPageAiPrompt } from "./trainingPageAi";

describe("trainingPageAi helpers", () => {
  it("기타 주제를 선택하면 customTopic을 필수로 검증한다", () => {
    expect(() =>
      trainingPageAiRequestSchema.parse({
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

  it("프롬프트가 참고 첨부 우선 규칙과 훈련안내페이지 전용 조건을 포함한다", () => {
    const prompt = buildTrainingPageAiPrompt({
      topic: "shipping",
      customTopic: "",
      tone: "formal",
      difficulty: "medium",
      prompt: "조용하고 차분한 학습 안내 문구를 넣어 주세요.",
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
    expect(prompt).toContain("{{SUBMIT_URL}} is not required for training-page output.");
    expect(prompt).toContain("training-reference.html");
    expect(prompt).toContain("<div>훈련안내 참고 레이아웃</div>");
  });
});
