import { z } from "zod";

export const TEMPLATE_AI_DRAFT_SESSION_KEY = "phishsense.template.ai-draft";
export const DEFAULT_TEMPLATE_AI_MODEL = "gemini-2.5-flash-lite";

export const templateAiTopicOptions = [
  "shipping",
  "account-security",
  "payroll-benefits",
  "hr-announcement",
  "approval",
  "it-maintenance",
] as const;

export const templateAiToneOptions = [
  "formal",
  "informational",
  "internal-notice",
  "urgent-request",
] as const;

export const templateAiDifficultyOptions = ["easy", "medium", "hard"] as const;

export const templateAiTopicLabels: Record<(typeof templateAiTopicOptions)[number], string> = {
  shipping: "Shipping",
  "account-security": "Account Security",
  "payroll-benefits": "Payroll / Benefits",
  "hr-announcement": "HR Announcement",
  approval: "Approval",
  "it-maintenance": "IT Maintenance",
};

export const templateAiToneLabels: Record<(typeof templateAiToneOptions)[number], string> = {
  formal: "Formal",
  informational: "Informational",
  "internal-notice": "Internal Notice",
  "urgent-request": "Urgent Request",
};

export const templateAiDifficultyLabels: Record<
  (typeof templateAiDifficultyOptions)[number],
  string
> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const templateAiRequestSchema = z.object({
  topic: z.enum(templateAiTopicOptions),
  tone: z.enum(templateAiToneOptions),
  difficulty: z.enum(templateAiDifficultyOptions),
  prompt: z
    .string()
    .trim()
    .max(800, "Additional prompt must be 800 characters or fewer.")
    .default(""),
  generateCount: z.number().int().min(1).max(4).default(4),
  preservedCandidates: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        subject: z.string().min(1),
      }),
    )
    .max(3)
    .default([]),
});

export type TemplateAiRequest = z.infer<typeof templateAiRequestSchema>;

export const templateAiCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  maliciousPageContent: z.string().min(1),
  summary: z.string().min(1),
});

export type TemplateAiCandidate = z.infer<typeof templateAiCandidateSchema>;

export const templateAiGenerateResponseSchema = z.object({
  candidates: z.array(templateAiCandidateSchema).min(1).max(4),
  usage: z
    .object({
      promptTokenCount: z.number().int().nonnegative(),
      candidatesTokenCount: z.number().int().nonnegative(),
      totalTokenCount: z.number().int().nonnegative(),
      estimatedCredits: z.number().int().positive(),
      model: z.string().min(1),
    })
    .optional(),
});

export type TemplateAiGenerateResponse = z.infer<typeof templateAiGenerateResponseSchema>;

export type TemplateAiDraft = TemplateAiCandidate & {
  source: "ai";
  generatedAt: string;
};

const TEMPLATE_AI_INPUT_COST_PER_MILLION = 0.1;
const TEMPLATE_AI_OUTPUT_COST_PER_MILLION = 0.4;
const CREDIT_USD_UNIT = 0.001;

export const estimateTokenCountFromText = (value: string) =>
  Math.max(1, Math.ceil(value.trim().length / 4));

export const estimateTemplateAiCredits = (args: {
  topic: string;
  tone: string;
  difficulty: string;
  prompt: string;
  candidateCount: number;
}) => {
  const promptTokenCount = estimateTokenCountFromText(
    `${args.topic} ${args.tone} ${args.difficulty} ${args.prompt}`,
  ) + 2200;
  const candidateTokenCount = Math.max(1, args.candidateCount) * 2600;
  const estimatedCostUsd =
    (promptTokenCount / 1_000_000) * TEMPLATE_AI_INPUT_COST_PER_MILLION +
    (candidateTokenCount / 1_000_000) * TEMPLATE_AI_OUTPUT_COST_PER_MILLION;

  return Math.max(1, Math.ceil(estimatedCostUsd / CREDIT_USD_UNIT));
};

export const findUnsafeTemplateHtmlIssues = (html: string) => {
  const issues: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/<script[\s\S]*?>/i, "Script tags are not allowed."],
    [/<iframe[\s\S]*?>/i, "iframe tags are not allowed."],
    [/<object[\s\S]*?>/i, "object tags are not allowed."],
    [/<embed[\s\S]*?>/i, "embed tags are not allowed."],
    [/<link[\s\S]*?>/i, "External CSS link tags are not allowed."],
    [/\son[a-z]+\s*=/i, "Inline event handlers are not allowed."],
    [/\s(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i, "External resource URLs are not allowed."],
    [/\s(?:src|href)\s*=\s*["']\s*javascript:/i, "javascript: URLs are not allowed."],
  ];

  rules.forEach(([pattern, message]) => {
    if (pattern.test(html)) {
      issues.push(message);
    }
  });

  return issues;
};
