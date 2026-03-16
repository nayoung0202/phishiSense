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

const buildGeminiSuccessResponse = (
  candidateCount: number,
  maliciousPageContent = '<form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">제출</button></form>',
) =>
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
                    maliciousPageContent,
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

  it("Gemini 503 오류는 재시도 가능한 서비스 오류로 바꾼다", async () => {
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

  it("재시도 중 응답이 복구되면 후보를 정상 반환한다", async () => {
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
          maliciousPageContent: expect.stringContaining('href="{{TRAINING_URL}}"'),
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

  it("모델 응답에 훈련 링크가 없으면 앵커를 자동 보강한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(buildGeminiSuccessResponse(1));

    vi.stubGlobal("fetch", fetchMock);

    const result = await generateTemplateAiCandidates({
      ...baseRequest,
      generateCount: 1,
    });

    expect(result.candidates[0]?.maliciousPageContent).toContain(
      'href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer"',
    );
  });

  it("모델 응답의 TRAINING_URL 오타 토큰을 표준 토큰으로 정규화한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildGeminiSuccessResponse(
          1,
          '<form action="{{tranning_url}}}"><input name="email" /><button type="submit">제출</button></form><a href="{{tranning_url}}}" target="_blank" rel="noopener noreferrer">훈련 안내</a>',
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await generateTemplateAiCandidates({
      ...baseRequest,
      generateCount: 1,
    });

    expect(result.candidates[0]?.maliciousPageContent).toContain('action="{{TRAINING_URL}}"');
    expect(result.candidates[0]?.maliciousPageContent).toContain('href="{{TRAINING_URL}}"');
    expect(result.candidates[0]?.maliciousPageContent).not.toContain("tranning_url");
  });
});
