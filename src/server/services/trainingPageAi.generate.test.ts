import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainingPageAiRequest } from "@shared/trainingPageAi";
import {
  generateTrainingPageAiCandidates,
  TrainingPageAiServiceError,
} from "./trainingPageAi";

const baseRequest: TrainingPageAiRequest = {
  topic: "other",
  customTopic: "파일 확인 훈련 안내",
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
  content = '<div><button type="button">확인</button></div>',
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
                    name: `훈련 후보 ${index + 1}`,
                    description: `설명 ${index + 1}`,
                    content,
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

describe("generateTrainingPageAiCandidates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("Gemini 503 오류를 재시도 가능한 서비스 오류로 변환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildGeminiUnavailableResponse())
      .mockResolvedValueOnce(buildGeminiUnavailableResponse())
      .mockResolvedValueOnce(buildGeminiUnavailableResponse());

    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateTrainingPageAiCandidates(baseRequest).catch((caught) => caught);

    await vi.runAllTimersAsync();

    const error = await resultPromise;

    expect(error).toBeInstanceOf(TrainingPageAiServiceError);
    expect(error).toMatchObject({
      status: 503,
      code: "gemini_service_unavailable",
      retryable: true,
      message: "AI 훈련안내페이지 생성 요청이 일시적으로 많습니다. 잠시 후 다시 시도하세요.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("정상 응답이면 SUBMIT_URL 없이도 후보를 반환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildGeminiUnavailableResponse())
      .mockResolvedValueOnce(buildGeminiSuccessResponse(4));

    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateTrainingPageAiCandidates(baseRequest);

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toMatchObject({
      candidates: expect.arrayContaining([
        expect.objectContaining({
          name: "훈련 후보 1",
          content: expect.stringContaining('type="button"'),
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

  it("단순 안내형 HTML도 안전 규칙만 통과하면 후보로 반환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildGeminiSuccessResponse(1, "<section><p>학습 안내를 다시 확인해 주세요.</p></section>"),
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateTrainingPageAiCandidates({
        ...baseRequest,
        generateCount: 1,
      }),
    ).resolves.toMatchObject({
      candidates: expect.arrayContaining([
        expect.objectContaining({
          content: "<section><p>학습 안내를 다시 확인해 주세요.</p></section>",
        }),
      ]),
    });
  });

  it("이미지 참고 첨부가 있으면 Gemini 요청 parts에 inlineData를 포함한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(buildGeminiSuccessResponse(1));

    vi.stubGlobal("fetch", fetchMock);

    await generateTrainingPageAiCandidates({
      ...baseRequest,
      generateCount: 1,
      referenceAttachment: {
        name: "training-reference.png",
        mimeType: "image/png",
        kind: "image",
        base64Data: "ZmFrZS1pbWFnZQ==",
      },
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      contents: Array<{
        parts: Array<{
          text?: string;
          inlineData?: {
            mimeType: string;
            data: string;
          };
        }>;
      }>;
    };

    expect(requestBody.contents[0]?.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("training-reference.png"),
        }),
        expect.objectContaining({
          inlineData: {
            mimeType: "image/png",
            data: "ZmFrZS1pbWFnZQ==",
          },
        }),
      ]),
    );
  });
});
