import { randomUUID } from "node:crypto";
import { neutralizePreviewModalHtml } from "@/lib/templatePreview";
import {
  DEFAULT_TEMPLATE_AI_MODEL,
  type TemplateAiCandidate,
  type TemplateAiRequest,
  type TemplateAiReferenceAttachment,
  findUnsafeTemplateHtmlIssues,
  resolveTemplateAiTopicText,
  templateAiDifficultyLabels,
  templateAiToneLabels,
} from "@shared/templateAi";
import { normalizeTrainingUrlPlaceholders } from "@shared/templateTokens";

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GenerateTemplateAiResult = {
  candidates: TemplateAiCandidate[];
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

type TemplateAiServiceErrorArgs = {
  status: number;
  code: string;
  message: string;
  retryable?: boolean;
};

export class TemplateAiServiceError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor({ status, code, message, retryable = false }: TemplateAiServiceErrorArgs) {
    super(message);
    this.name = "TemplateAiServiceError";
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
          subject: { type: "STRING" },
          body: { type: "STRING" },
          maliciousPageContent: { type: "STRING" },
          summary: { type: "STRING" },
        },
        required: ["subject", "body", "maliciousPageContent", "summary"],
      },
    },
  },
  required: ["candidates"],
};

const referenceMailBodyHtml = `
<div style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#111827;line-height:1.6">
  <p style="margin:0 0 12px"><strong>[Address Confirmation Required]</strong></p>
  <p style="margin:0 0 12px">The shipment needs to be reassigned due to a delivery failure.</p>
  <p style="margin:0 0 12px">The parcel is currently on <strong>temporary hold</strong> because the address could not be verified.</p>
  <ul style="margin:0 0 16px 18px;padding:0">
    <li>Reason: incomplete unit number or unreachable phone number</li>
    <li>Deadline: <strong>today by 5:00 PM</strong></li>
    <li>If not confirmed, the parcel may be returned automatically.</li>
  </ul>
  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb" />
  <p style="margin:0 0 8px"><strong>Confirm delivery details</strong></p>
  <p style="margin:0 0 16px">Use the button below to review and resubmit the delivery information.</p>
  <div style="text-align:center">
    <a href="{{LANDING_URL}}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">
      Confirm address and request reassignment
    </a>
  </div>
</div>
`.trim();

const referenceMaliciousPageHtml = `
<div style="display:flex;justify-content:center;padding:48px 24px;background:#f3f4f6">
  <div style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden">
    <div style="padding:20px 22px 14px;border-bottom:1px solid #e5e7eb">
      <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827">Delivery details confirmation</p>
      <p style="margin:0;color:#374151">Enter the details below and submit the form to continue the reassignment process.</p>
    </div>
    <div style="padding:18px 22px 10px">
      <form method="POST" action="{{TRAINING_URL}}">
        <div style="display:grid;gap:10px">
          <div>
            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">Recipient name</label>
            <input type="text" name="receiver_name" placeholder="Hong Gil-dong" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />
          </div>
          <div>
            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">Phone number</label>
            <input type="tel" name="phone" placeholder="010-0000-0000" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />
          </div>
          <div>
            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">Primary address</label>
            <input type="text" name="address1" placeholder="123 Teheran-ro, Gangnam-gu, Seoul" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />
          </div>
        </div>
        <div style="display:flex;justify-content:center;margin:18px 0 6px">
          <button type="submit" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border:none;border-radius:999px;background:#2563eb;color:#ffffff;font-weight:700;cursor:pointer">
            Confirm address and request reassignment
          </button>
        </div>
      </form>
      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;text-align:center">
        This is an automated notice for shipment reassignment.<br />
        Support desk: 1588-0000
      </p>
    </div>
  </div>
</div>
`.trim();

const templateAiRetryDelaysMs = [700, 1400];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createTemplateAiServiceError = (args: TemplateAiServiceErrorArgs) =>
  new TemplateAiServiceError(args);

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
    return createTemplateAiServiceError({
      status: 503,
      code: "gemini_service_unavailable",
      message: "AI 템플릿 생성 요청이 일시적으로 많습니다. 잠시 후 다시 시도하세요.",
      retryable: true,
    });
  }

  if (status >= 500) {
    return createTemplateAiServiceError({
      status: 503,
      code: "gemini_service_unavailable",
      message: "AI 템플릿 생성 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도하세요.",
      retryable: true,
    });
  }

  if (status >= 400) {
    return createTemplateAiServiceError({
      status: 502,
      code: "gemini_api_error",
      message: "AI 템플릿 생성 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.",
    });
  }

  return createTemplateAiServiceError({
    status: 500,
    code: "template_ai_generate_failed",
    message: "AI 템플릿 생성에 실패했습니다.",
  });
};

const createGeminiNetworkError = () =>
  createTemplateAiServiceError({
    status: 503,
    code: "gemini_network_error",
    message: "AI 템플릿 생성 서비스에 연결하지 못했습니다. 잠시 후 다시 시도하세요.",
    retryable: true,
  });

const createGeminiInvalidResponseError = () =>
  createTemplateAiServiceError({
    status: 502,
    code: "gemini_invalid_response",
    message: "AI 템플릿 생성 응답이 올바르지 않습니다. 잠시 후 다시 시도하세요.",
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

const trainingSubmitTargetPattern =
  /<form\b[^>]*\baction=["']?\s*\{\{\s*TRAINING_URL\s*\}\}\s*["']?[^>]*>|<(?:button|input)\b[^>]*\bformaction=["']?\s*\{\{\s*TRAINING_URL\s*\}\}\s*["']?[^>]*>/i;

const sanitizeCandidate = (candidate: Omit<TemplateAiCandidate, "id">) => {
  const normalizedCandidate = {
    ...candidate,
    subject: candidate.subject.trim(),
    body: candidate.body.trim(),
    maliciousPageContent: normalizeTrainingUrlPlaceholders(
      neutralizePreviewModalHtml(candidate.maliciousPageContent).trim(),
    ),
    summary: candidate.summary.trim(),
  };
  const mailIssues = findUnsafeTemplateHtmlIssues(normalizedCandidate.body);
  const maliciousIssues = findUnsafeTemplateHtmlIssues(normalizedCandidate.maliciousPageContent);

  if (mailIssues.length > 0 || maliciousIssues.length > 0) {
    throw new Error([...mailIssues, ...maliciousIssues].join(" "));
  }

  if (!/\{\{\s*LANDING_URL\s*\}\}/i.test(normalizedCandidate.body)) {
    throw new Error("메일본문에는 {{LANDING_URL}}가 포함되어야 합니다.");
  }

  if (!/\{\{\s*TRAINING_URL\s*\}\}/i.test(normalizedCandidate.maliciousPageContent)) {
    throw new Error("악성메일본문에는 {{TRAINING_URL}}가 포함되어야 합니다.");
  }

  if (!/<form[\s\S]*?>/i.test(normalizedCandidate.maliciousPageContent)) {
    throw new Error("악성메일본문에는 입력 폼이 포함되어야 합니다.");
  }

  if (
    !/<button[\s\S]*?type=["']?submit["']?[\s\S]*?>|<input[\s\S]*?type=["']?submit["']?[\s\S]*?>/i.test(
      normalizedCandidate.maliciousPageContent,
    )
  ) {
    throw new Error("악성메일본문에는 제출 버튼이 포함되어야 합니다.");
  }

  if (!trainingSubmitTargetPattern.test(normalizedCandidate.maliciousPageContent)) {
    throw new Error(
      "악성메일본문에는 {{TRAINING_URL}}이 제출 동선(폼 action 또는 submit formaction)에 포함되어야 합니다.",
    );
  }

  return {
    id: randomUUID(),
    ...normalizedCandidate,
  };
};

const buildReferenceAttachmentPrompt = (
  label: string,
  attachment?: TemplateAiReferenceAttachment,
) => {
  if (!attachment) {
    return `- ${label} reference attachment: none`;
  }

  if (attachment.kind === "html") {
    return `
- ${label} reference attachment: ${attachment.name} (${attachment.mimeType})
Treat the following HTML reference as the primary basis for ${label}. The generated ${label} must clearly follow its information architecture, block order, field composition, and visual hierarchy while still adapting wording and scenario details. Do not copy it verbatim.

${attachment.textContent}
    `.trim();
  }

  return `
- ${label} reference attachment: ${attachment.name} (${attachment.mimeType})
A reference image for ${label} will be attached after this prompt. Treat that image as the primary basis for ${label}. The generated ${label} must clearly reflect its layout, spacing, emphasis, and component hierarchy while adapting wording and scenario details. Do not copy it verbatim.
  `.trim();
};

const buildGeminiRequestParts = (request: TemplateAiRequest) => {
  const parts: Array<
    | { text: string }
    | {
        inlineData: {
          mimeType: string;
          data: string;
        };
      }
  > = [{ text: buildTemplateAiPrompt(request) }];

  if (request.mailBodyReferenceAttachment?.kind === "image") {
    const data = request.mailBodyReferenceAttachment.base64Data;
    if (data) {
      parts.push({
        text: "Mail body reference image attachment. Use it only for the mail body output.",
      });
      parts.push({
        inlineData: {
          mimeType: request.mailBodyReferenceAttachment.mimeType,
          data,
        },
      });
    }
  }

  if (request.maliciousPageReferenceAttachment?.kind === "image") {
    const data = request.maliciousPageReferenceAttachment.base64Data;
    if (data) {
      parts.push({
        text: "Malicious page reference image attachment. Use it only for the maliciousPageContent output.",
      });
      parts.push({
        inlineData: {
          mimeType: request.maliciousPageReferenceAttachment.mimeType,
          data,
        },
      });
    }
  }

  return parts;
};

const requestGeminiCandidates = async (request: TemplateAiRequest, apiKey: string) => {
  let lastError: TemplateAiServiceError | null = null;

  for (let attempt = 0; attempt <= templateAiRetryDelaysMs.length; attempt += 1) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_TEMPLATE_AI_MODEL}:generateContent?key=${apiKey}`,
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
      if (error instanceof TemplateAiServiceError) {
        lastError = error;
      } else {
        lastError = createGeminiNetworkError();
      }
    }

    if (!lastError.retryable || attempt === templateAiRetryDelaysMs.length) {
      throw lastError;
    }

    await sleep(templateAiRetryDelaysMs[attempt]);
  }

  throw lastError ?? createGeminiNetworkError();
};

export const buildTemplateAiPrompt = (request: TemplateAiRequest) => {
  const topicText = resolveTemplateAiTopicText(request);
  const toneText = templateAiToneLabels[request.tone];
  const difficultyText = templateAiDifficultyLabels[request.difficulty];
  const attachmentText = [
    buildReferenceAttachmentPrompt("mail body", request.mailBodyReferenceAttachment),
    buildReferenceAttachmentPrompt(
      "malicious page",
      request.maliciousPageReferenceAttachment,
    ),
  ].join("\n");
  const preservedText =
    request.preservedCandidates.length > 0
      ? `Preserved candidates:\n${request.preservedCandidates
          .map((item, index) => `${index + 1}. subject: ${item.subject}`)
          .join("\n")}\nAvoid generating results that are too similar to these preserved candidates.`
      : "There are no preserved candidates.";

  return `
You are generating phishing simulation template drafts for a security training product.
Write the contents in Korean, but return JSON only.

Rules:
- Generate exactly ${request.generateCount} candidate sets.
- Each candidate set must contain both a mail body and a malicious landing page that share the same topic and tone.
- The mail body must include a subject, content, and a CTA link or button.
- Every clickable CTA in the mail body must point to {{LANDING_URL}}.
- The malicious page must be a static landing page with a form and a submit button.
- The malicious page must redirect or submit to {{TRAINING_URL}} after submission.
- The main submit CTA in the malicious page must route to {{TRAINING_URL}} via form action or submit formaction.
- Do not add a separate standalone training guide link unless the user explicitly asks for it.
- If a section-specific reference attachment is provided, that attachment is the primary basis for that section's output.
- When section-specific reference attachments are provided, prioritize them over the built-in reference HTML for that section.
- When reference attachments are provided, adapt useful layout and wording cues without copying them verbatim.
- Do not use JavaScript, external CSS, external scripts, or external images/resources.
- Do not render the malicious page as a fixed-position modal, dialog, or overlay.
- Inline CSS and style tags are allowed.
- body must be a complete mail-body HTML string for this product and may include inline CSS or style tags.
- maliciousPageContent must be a complete malicious-page HTML string for this product and may include inline CSS or style tags.
- summary should be a one-line differentiator shown under the subject.
- Use the reference composition below as the baseline visual language for both outputs.
- Do not copy the reference verbatim; adapt the wording, labels, and scenario details to the requested topic and tone.
- Keep the same level of inline styling, spacing, and structural clarity shown in the reference.
- body should feel like an operational notice email: alert headline, short explanation, 2-3 bullet points, a divider, and a single clear CTA.
- maliciousPageContent should feel like a focused inline card UI shown directly on the page: soft page background, centered white panel, short header, stacked inputs, and one strong primary submit button.
- For maliciousPageContent, prefer a form action that points to {{TRAINING_URL}}.

Generation inputs:
- topic: ${topicText}
- tone: ${toneText}
- difficulty: ${difficultyText}
- extra requirements: ${request.prompt || "none"}

Reference attachments:
${attachmentText}

Variation instructions:
${preservedText}

Reference mail-body HTML shape:
${referenceMailBodyHtml}

Reference malicious-page HTML shape:
${referenceMaliciousPageHtml}

JSON format:
{
  "candidates": [
    {
      "subject": "string",
      "body": "string",
      "maliciousPageContent": "string",
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

export async function generateTemplateAiCandidates(
  request: TemplateAiRequest,
): Promise<GenerateTemplateAiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw createTemplateAiServiceError({
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
      candidates?: Array<Omit<TemplateAiCandidate, "id">>;
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
        model: DEFAULT_TEMPLATE_AI_MODEL,
      },
    };
  } catch (error) {
    if (error instanceof TemplateAiServiceError) {
      throw error;
    }

    throw createGeminiInvalidResponseError();
  }
}
