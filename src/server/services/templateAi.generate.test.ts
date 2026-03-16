import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TemplateAiRequest } from "@shared/templateAi";
import {
  generateTemplateAiCandidates,
  TemplateAiServiceError,
} from "./templateAi";

const baseRequest: TemplateAiRequest = {
  topic: "other",
  customTopic: "한글 파일 잘못된 다운로드",
  tone: "informational",
  difficulty: "medium",
  prompt: "",
  generateCount: 4,
  preservedCandidates: [],
};

const buildGeminiUnavailableResponse = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 503,
        message:
          "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
        status: "UNAVAILABLE",
      },
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

const buildGeminiSuccessResponse = (candidateCount: number) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  candidates: Array.from({ length: candidateCount }, (_, index) => ({
                    subject: `후보 ${index + 1}`,
                    body: '<div><a href="{{LANDING_URL}}">확인</a></div>',
                    maliciousPageContent:
                      '<form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">제출</button></form>',
                    summary: `요약 ${index + 1}`,
                  })),
                }),
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 200,
        totalTokenCount: 300,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

describe("generateTemplateAiCandidates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("Gemini 503 과부하는 재시도 후 서비스 오류로 변환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildGeminiUnavailableResponse())
      .mockResolvedValueOnce(buildGeminiUnavailableResponse())
      .mockResolvedValueOnce(buildGeminiUnavailableResponse());

    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateTemplateAiCandidates(baseRequest);

    await vi.runAllTimersAsync();

    await expect(resultPromise).rejects.toBeInstanceOf(TemplateAiServiceError);
    await expect(resultPromise).rejects.toMatchObject({
      status: 503,
      code: "gemini_service_unavailable",
      retryable: true,
      message: "AI 템플릿 생성 요청이 일시적으로 많습니다. 잠시 후 다시 시도하세요.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("재시도 중 응답이 회복되면 후보를 정상 반환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildGeminiUnavailableResponse())
      .mockResolvedValueOnce(buildGeminiSuccessResponse(4));

    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateTemplateAiCandidates(baseRequest);

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toMatchObject({
      candidates: expect.arrayContaining([
        expect.objectContaining({
          subject: "후보 1",
        }),
      ]),
      usage: expect.objectContaining({
        promptTokenCount: 100,
        candidatesTokenCount: 200,
        totalTokenCount: 300,
        model: "gemini-2.5-flash-lite",
      }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
