import { randomUUID } from "node:crypto";
import { neutralizePreviewModalHtml } from "@/lib/templatePreview";
import {
  DEFAULT_TEMPLATE_AI_MODEL,
  type TemplateAiCandidate,
  type TemplateAiRequest,
  findUnsafeTemplateHtmlIssues,
  resolveTemplateAiTopicText,
  templateAiDifficultyLabels,
  templateAiToneLabels,
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
  const normalizedCandidate = {
    ...candidate,
    subject: candidate.subject.trim(),
    body: candidate.body.trim(),
    maliciousPageContent: neutralizePreviewModalHtml(candidate.maliciousPageContent).trim(),
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

  return {
    id: randomUUID(),
    ...normalizedCandidate,
  };
};

export const buildTemplateAiPrompt = (request: TemplateAiRequest) => {
  const topicText = resolveTemplateAiTopicText(request);
  const toneText = templateAiToneLabels[request.tone];
  const difficultyText = templateAiDifficultyLabels[request.difficulty];
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
            parts: [{ text: buildTemplateAiPrompt(request) }],
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
}
