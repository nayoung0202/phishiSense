import { randomUUID } from "node:crypto";
import {
  DEFAULT_TEMPLATE_AI_MODEL,
  type TemplateAiCandidate,
  type TemplateAiRequest,
  findUnsafeTemplateHtmlIssues,
} from "@shared/templateAi";

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

const sanitizeCandidate = (candidate: Omit<TemplateAiCandidate, "id">) => {
  const mailIssues = findUnsafeTemplateHtmlIssues(candidate.body);
  const maliciousIssues = findUnsafeTemplateHtmlIssues(candidate.maliciousPageContent);

  if (mailIssues.length > 0 || maliciousIssues.length > 0) {
    throw new Error([...mailIssues, ...maliciousIssues].join(" "));
  }

  if (!/\{\{\s*LANDING_URL\s*\}\}/i.test(candidate.body)) {
    throw new Error("메일본문에 {{LANDING_URL}}가 포함되어야 합니다.");
  }

  if (!/\{\{\s*TRAINING_URL\s*\}\}/i.test(candidate.maliciousPageContent)) {
    throw new Error("악성메일본문에 {{TRAINING_URL}}가 포함되어야 합니다.");
  }

  if (!/<form[\s\S]*?>/i.test(candidate.maliciousPageContent)) {
    throw new Error("악성메일본문에는 입력 폼이 포함되어야 합니다.");
  }

  if (!/<button[\s\S]*?type=["']?submit["']?[\s\S]*?>|<input[\s\S]*?type=["']?submit["']?[\s\S]*?>/i.test(candidate.maliciousPageContent)) {
    throw new Error("악성메일본문에는 제출 버튼이 포함되어야 합니다.");
  }

  return {
    id: randomUUID(),
    ...candidate,
  };
};

const buildPrompt = (request: TemplateAiRequest) => {
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
- Do not use JavaScript, external CSS, external scripts, or external images/resources.
- Inline CSS and style tags are allowed.
- body must be a complete mail-body HTML string for this product and may include inline CSS or style tags.
- maliciousPageContent must be a complete malicious-page HTML string for this product and may include inline CSS or style tags.
- summary should be a one-line differentiator shown under the subject.

Generation inputs:
- topic: ${request.topic}
- tone: ${request.tone}
- difficulty: ${request.difficulty}
- extra requirements: ${request.prompt || "none"}

Variation instructions:
${preservedText}

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
  const estimatedCostUsd = promptTokenCount * (0.1 / 1_000_000) + candidatesTokenCount * (0.4 / 1_000_000);
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
    throw new Error("gemini_api_key_missing");
  }

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
            parts: [{ text: buildPrompt(request) }],
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
    const message = await response.text();
    throw new Error(message || "template_ai_generate_failed");
  }

  const payload = await response.json();
  const text = extractJsonText(payload);
  const parsed = JSON.parse(text) as {
    candidates?: Array<Omit<TemplateAiCandidate, "id">>;
  };
  const rawCandidates = parsed.candidates ?? [];

  if (rawCandidates.length !== request.generateCount) {
    throw new Error("candidate_count_mismatch");
  }

  const candidates = rawCandidates.map(sanitizeCandidate);
  const usage = estimateCreditsFromUsage((payload as { usageMetadata?: GeminiUsageMetadata }).usageMetadata ?? {});

  return {
    candidates,
    usage: {
      ...usage,
      model: DEFAULT_TEMPLATE_AI_MODEL,
    },
  };
}
