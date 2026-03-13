import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTemplateAiCandidatesMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/templateAi", () => ({
  generateTemplateAiCandidates: generateTemplateAiCandidatesMock,
}));

import { POST } from "./route";

describe("POST /api/templates/ai-generate", () => {
  beforeEach(() => {
    generateTemplateAiCandidatesMock.mockReset();
  });

  it("name 없이 생성된 후보를 반환한다", async () => {
    generateTemplateAiCandidatesMock.mockResolvedValue({
      candidates: [
        {
          id: "candidate-1",
          subject: "보안 점검 안내",
          body: '<style>body{font-family:sans-serif;}</style><a href="{{LANDING_URL}}">확인</a>',
          maliciousPageContent:
            '<style>body{background:#fff;}</style><form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">제출</button></form>',
          summary: "보안 공지형 후보",
        },
      ],
      usage: {
        promptTokenCount: 100,
        candidatesTokenCount: 200,
        totalTokenCount: 300,
        estimatedCredits: 1,
        model: "gemini-2.5-flash-lite",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "shipping",
          tone: "formal",
          difficulty: "easy",
          prompt: "",
          generateCount: 1,
          preservedCandidates: [{ id: "keep-1", subject: "기존 후보 제목" }],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0]).not.toHaveProperty("name");
    expect(generateTemplateAiCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preservedCandidates: [{ id: "keep-1", subject: "기존 후보 제목" }],
      }),
    );
  });

  it("잘못된 요청 본문이면 400을 반환한다", async () => {
    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "unknown",
          tone: "formal",
          difficulty: "easy",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(generateTemplateAiCandidatesMock).not.toHaveBeenCalled();
  });
});
