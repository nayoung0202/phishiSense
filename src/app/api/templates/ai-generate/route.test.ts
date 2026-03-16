import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTemplateAiCandidatesMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/templateAi", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/templateAi")>(
    "@/server/services/templateAi",
  );

  return {
    ...actual,
    generateTemplateAiCandidates: generateTemplateAiCandidatesMock,
  };
});

import { TemplateAiServiceError } from "@/server/services/templateAi";
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
          customTopic: "",
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
        topic: "shipping",
        customTopic: "",
        preservedCandidates: [{ id: "keep-1", subject: "기존 후보 제목" }],
      }),
    );
  });

  it("기타 주제와 직접 입력 주제를 함께 전달할 수 있다", async () => {
    generateTemplateAiCandidatesMock.mockResolvedValue({
      candidates: [
        {
          id: "candidate-1",
          subject: "사내 행사 참가 신청 안내",
          body: '<a href="{{LANDING_URL}}">확인</a>',
          maliciousPageContent:
            '<form action="{{TRAINING_URL}}"><input name="name" /><button type="submit">제출</button></form>',
          summary: "사내 행사 안내형 후보",
        },
      ],
      usage: {
        promptTokenCount: 120,
        candidatesTokenCount: 240,
        totalTokenCount: 360,
        estimatedCredits: 1,
        model: "gemini-2.5-flash-lite",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "other",
          customTopic: "사내 행사 안내",
          tone: "informational",
          difficulty: "medium",
          prompt: "행사 신청 독려 문구를 넣어 주세요.",
          generateCount: 1,
          preservedCandidates: [],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(generateTemplateAiCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "other",
        customTopic: "사내 행사 안내",
      }),
    );
  });

  it("기타 주제를 선택하고 직접 입력이 없으면 400을 반환한다", async () => {
    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "other",
          customTopic: "",
          tone: "formal",
          difficulty: "easy",
          prompt: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(generateTemplateAiCandidatesMock).not.toHaveBeenCalled();
  });

  it("잘못된 주제 값이면 400을 반환한다", async () => {
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

  it("Gemini 일시 장애는 503과 안내 문구를 반환한다", async () => {
    generateTemplateAiCandidatesMock.mockRejectedValue(
      new TemplateAiServiceError({
        status: 503,
        code: "gemini_service_unavailable",
        message: "AI 템플릿 생성 요청이 일시적으로 많습니다. 잠시 후 다시 시도하세요.",
        retryable: true,
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "other",
          customTopic: "한글 파일 잘못된 다운로드",
          tone: "informational",
          difficulty: "medium",
          prompt: "",
          generateCount: 4,
          preservedCandidates: [],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "AI 템플릿 생성 요청이 일시적으로 많습니다. 잠시 후 다시 시도하세요.",
      code: "gemini_service_unavailable",
      retryable: true,
    });
  });
});
