import { randomUUID } from "node:crypto";
import {
  DEFAULT_TRAINING_PAGE_AI_MODEL,
  type TemplateAiReferenceAttachment,
  type TrainingPageAiCandidate,
  type TrainingPageAiRequest,
  buildTrainingPageAiMandatoryGuidance,
  buildTrainingPageAiTopicText,
} from "@shared/trainingPageAi";
import { findUnsafeTemplateHtmlIssues } from "@shared/templateAi";

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GenerateTrainingPageAiResult = {
  candidates: TrainingPageAiCandidate[];
  usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    estimatedCredits: number;
    model: string;
  };
};

type GeminiApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type TrainingPageAiServiceErrorArgs = {
  status: number;
  code: string;
  message: string;
  retryable?: boolean;
};

export class TrainingPageAiServiceError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor({
    status,
    code,
    message,
    retryable = false,
  }: TrainingPageAiServiceErrorArgs) {
    super(message);
    this.name = "TrainingPageAiServiceError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const responseSchema = {
  type: "OBJECT",
  properties: {
    candidates: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          description: { type: "STRING" },
          content: { type: "STRING" },
          summary: { type: "STRING" },
        },
        required: ["name", "description", "content", "summary"],
      },
    },
  },
  required: ["candidates"],
};

const stripInteractiveElements = (html: string) =>
  html
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, "$1");

const referenceTrainingPageHtml = `
<div style="min-height:100vh;background:#f8fafc;padding:48px 20px;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 20px 50px rgba(15,23,42,0.12);overflow:hidden">
    <div style="padding:28px 28px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#eff6ff,#ecfeff)">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#0369a1">SECURITY TRAINING</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#0f172a">모의훈련 안내</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7">
        방금 확인하신 화면은 사내 보안 인식 강화를 위한 훈련 시나리오입니다.
        실제 계정이나 결제 정보를 수집하지 않으며, 이번 안내를 통해 의심 링크를 확인하는 방법을 다시 익혀 주세요.
      </p>
      <div style="margin:20px 0;padding:18px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f172a">핵심 확인 포인트</p>
        <ul style="margin:0;padding-left:18px;color:#334155;line-height:1.7">
          <li>발신 주소와 링크 목적지를 먼저 확인합니다.</li>
          <li>긴급함을 강조하는 문구일수록 한 번 더 검토합니다.</li>
          <li>의심 메일은 즉시 보안 담당자에게 공유합니다.</li>
        </ul>
      </div>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#475569">
        위 내용을 숙지하고, 다음 메일 수신 시 동일한 징후가 있는지 먼저 확인해 주세요.
      </p>
    </div>
  </div>
</div>
`.trim();

const trainingPageAiRetryDelaysMs = [700, 1400];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createTrainingPageAiServiceError = (args: TrainingPageAiServiceErrorArgs) =>
  new TrainingPageAiServiceError(args);

const parseGeminiErrorPayload = (rawText: string, fallbackStatus: number) => {
  const normalizedText = rawText.trim();

  if (!normalizedText) {
    return {
      status: fallbackStatus,
      message: "",
      errorStatus: "",
    };
  }

  try {
    const parsed = JSON.parse(normalizedText) as GeminiApiErrorPayload;

    return {
      status: parsed.error?.code ?? fallbackStatus,
      message: parsed.error?.message?.trim() ?? normalizedText,
      errorStatus: parsed.error?.status?.trim() ?? "",
    };
  } catch {
    return {
      status: fallbackStatus,
      message: normalizedText,
      errorStatus: "",
    };
  }
};

const createGeminiApiError = (responseStatus: number, rawText: string) => {
  const { status, message, errorStatus } = parseGeminiErrorPayload(rawText, responseStatus);
  const isHighDemand =
    status === 429 ||
    status === 503 ||
    errorStatus === "UNAVAILABLE" ||
    /high demand|try again later/i.test(message);

  if (isHighDemand) {
    return createTrainingPageAiServiceError({
      status: 503,
      code: "gemini_service_unavailable",
      message: "AI 훈련안내페이지 생성 요청이 일시적으로 많습니다. 잠시 후 다시 시도하세요.",
      retryable: true,
    });
  }

  if (status >= 500) {
    return createTrainingPageAiServiceError({
      status: 503,
      code: "gemini_service_unavailable",
      message: "AI 훈련안내페이지 생성 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도하세요.",
      retryable: true,
    });
  }

  if (status >= 400) {
    return createTrainingPageAiServiceError({
      status: 502,
      code: "gemini_api_error",
      message: "AI 훈련안내페이지 생성 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.",
    });
  }

  return createTrainingPageAiServiceError({
    status: 500,
    code: "training_page_ai_generate_failed",
    message: "AI 훈련안내페이지 생성에 실패했습니다.",
  });
};

const createGeminiNetworkError = () =>
  createTrainingPageAiServiceError({
    status: 503,
    code: "gemini_network_error",
    message: "AI 훈련안내페이지 생성 서비스에 연결하지 못했습니다. 잠시 후 다시 시도하세요.",
    retryable: true,
  });

const createGeminiInvalidResponseError = () =>
  createTrainingPageAiServiceError({
    status: 502,
    code: "gemini_invalid_response",
    message: "AI 훈련안내페이지 생성 응답이 올바르지 않습니다. 잠시 후 다시 시도하세요.",
  });

const extractJsonText = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("invalid_ai_response");
  }

  const parts = ((payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  }).candidates ?? [])[0]?.content?.parts ?? [];

  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("empty_ai_response");
  }

  return text;
};

const sanitizeCandidate = (candidate: Omit<TrainingPageAiCandidate, "id">) => {
  const normalizedCandidate = {
    ...candidate,
    name: candidate.name.trim(),
    description: candidate.description.trim(),
    content: stripInteractiveElements(candidate.content.trim()),
    summary: candidate.summary.trim(),
  };
  const contentIssues = findUnsafeTemplateHtmlIssues(normalizedCandidate.content);

  if (contentIssues.length > 0) {
    throw new Error(contentIssues.join(" "));
  }

  return {
    id: randomUUID(),
    ...normalizedCandidate,
  };
};

const buildReferenceAttachmentPrompt = (attachment?: TemplateAiReferenceAttachment) => {
  if (!attachment) {
    return "- training page reference attachment: none";
  }

  if (attachment.kind === "html") {
    return `
- training page reference attachment: ${attachment.name} (${attachment.mimeType})
Treat the following HTML reference as the primary basis for the training page. The generated training page must clearly follow its information architecture, block order, and visual hierarchy while still adapting wording and scenario details. Do not copy it verbatim.

${attachment.textContent}
    `.trim();
  }

  return `
- training page reference attachment: ${attachment.name} (${attachment.mimeType})
A reference image for the training page will be attached after this prompt. Treat that image as the primary basis for the training page. The generated training page must clearly reflect its layout, spacing, emphasis, and component hierarchy while adapting wording and scenario details. Do not copy it verbatim.
  `.trim();
};

const buildGeminiRequestParts = (request: TrainingPageAiRequest) => {
  const parts: Array<
    | { text: string }
    | {
        inlineData: {
          mimeType: string;
          data: string;
        };
      }
  > = [{ text: buildTrainingPageAiPrompt(request) }];

  if (request.referenceAttachment?.kind === "image") {
    const data = request.referenceAttachment.base64Data;
    if (data) {
      parts.push({
        text: "Training page reference image attachment. Use it only for the training page output.",
      });
      parts.push({
        inlineData: {
          mimeType: request.referenceAttachment.mimeType,
          data,
        },
      });
    }
  }

  return parts;
};

const requestGeminiCandidates = async (request: TrainingPageAiRequest, apiKey: string) => {
  let lastError: TrainingPageAiServiceError | null = null;

  for (let attempt = 0; attempt <= trainingPageAiRetryDelaysMs.length; attempt += 1) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_TRAINING_PAGE_AI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: buildGeminiRequestParts(request),
              },
            ],
            generationConfig: {
              temperature: 1,
              topP: 0.95,
              responseMimeType: "application/json",
              responseSchema,
            },
          }),
        },
      );

      if (!response.ok) {
        lastError = createGeminiApiError(response.status, await response.text());
      } else {
        try {
          return await response.json();
        } catch {
          throw createGeminiInvalidResponseError();
        }
      }
    } catch (error) {
      if (error instanceof TrainingPageAiServiceError) {
        lastError = error;
      } else {
        lastError = createGeminiNetworkError();
      }
    }

    if (!lastError.retryable || attempt === trainingPageAiRetryDelaysMs.length) {
      throw lastError;
    }

    await sleep(trainingPageAiRetryDelaysMs[attempt]);
  }

  throw lastError ?? createGeminiNetworkError();
};

export const buildTrainingPageAiPrompt = (request: TrainingPageAiRequest) => {
  const topicText = buildTrainingPageAiTopicText(request);
  const mandatoryGuidance = buildTrainingPageAiMandatoryGuidance(request);
  const attachmentText = buildReferenceAttachmentPrompt(request.referenceAttachment);
  const preservedText =
    request.preservedCandidates.length > 0
      ? `Preserved candidates:\n${request.preservedCandidates
          .map((item, index) => `${index + 1}. name: ${item.name}`)
          .join("\n")}\nAvoid generating results that are too similar to these preserved candidates.`
      : "There are no preserved candidates.";

  return `
You are generating phishing training landing page drafts for a security awareness product.
Write the contents in Korean, but return JSON only.

Rules:
- Generate exactly ${request.generateCount} candidate pages.
- Each candidate must contain name, description, content, and summary.
- name should be a concise Korean page title that can be used directly as the training page name.
- content must be a complete training-page HTML string for this product and may include inline CSS or style tags.
- The page must clearly explain that the user has reached a phishing simulation or security training notice page.
- If a reference attachment is provided, that attachment is the primary basis for the output.
- When a reference attachment is provided, prioritize it over the built-in reference HTML.
- Adapt useful layout and wording cues without copying verbatim.
- Do not use JavaScript, external CSS, external scripts, or external images/resources.
- Inline CSS and style tags are allowed.
- Do not render the page as a fixed-position modal, dialog, or overlay.
- Do not include links, anchor tags, buttons, or any click-inducing CTA element.
- summary should be a one-line differentiator shown under the page name.
- Keep the same level of inline styling, spacing, and structural clarity shown in the reference.
- The page should feel like a calm post-training explanation screen: clear title, short explanation, 2-3 key points, and a short closing guidance sentence.
- {{SUBMIT_URL}} is not required for training-page output.

Generation inputs:
- topic: ${topicText}
- extra requirements: ${request.prompt || "none"}

Mandatory safety guidance for this topic:
- scenario label: ${mandatoryGuidance.topicLabel}
${mandatoryGuidance.lines.map((line) => `- ${line}`).join("\n")}

Reference attachment:
${attachmentText}

Variation instructions:
${preservedText}

Reference training-page HTML shape:
${referenceTrainingPageHtml}

JSON format:
{
  "candidates": [
    {
      "name": "string",
      "description": "string",
      "content": "string",
      "summary": "string"
    }
  ]
}
  `.trim();
};

const estimateCreditsFromUsage = (usage: GeminiUsageMetadata) => {
  const promptTokenCount = usage.promptTokenCount ?? 0;
  const candidatesTokenCount = usage.candidatesTokenCount ?? 0;
  const totalTokenCount = usage.totalTokenCount ?? promptTokenCount + candidatesTokenCount;
  const estimatedCostUsd =
    promptTokenCount * (0.1 / 1_000_000) + candidatesTokenCount * (0.4 / 1_000_000);

  return {
    promptTokenCount,
    candidatesTokenCount,
    totalTokenCount,
    estimatedCredits: Math.max(1, Math.ceil(estimatedCostUsd / 0.001)),
  };
};

export async function generateTrainingPageAiCandidates(
  request: TrainingPageAiRequest,
): Promise<GenerateTrainingPageAiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw createTrainingPageAiServiceError({
      status: 503,
      code: "gemini_api_key_missing",
      message:
        "서버에 Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 추가한 뒤 서버를 다시 시작하세요.",
    });
  }

  const payload = await requestGeminiCandidates(request, apiKey);

  try {
    const text = extractJsonText(payload);
    const parsed = JSON.parse(text) as {
      candidates?: Array<Omit<TrainingPageAiCandidate, "id">>;
    };
    const rawCandidates = parsed.candidates ?? [];

    if (rawCandidates.length !== request.generateCount) {
      throw new Error("candidate_count_mismatch");
    }

    const candidates = rawCandidates.map(sanitizeCandidate);
    const usage = estimateCreditsFromUsage(
      (payload as { usageMetadata?: GeminiUsageMetadata }).usageMetadata ?? {},
    );

    return {
      candidates,
      usage: {
        ...usage,
        model: DEFAULT_TRAINING_PAGE_AI_MODEL,
      },
    };
  } catch (error) {
    if (error instanceof TrainingPageAiServiceError) {
      throw error;
    }

    throw createGeminiInvalidResponseError();
  }
}
