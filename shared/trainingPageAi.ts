import { z } from "zod";
import {
  DEFAULT_TEMPLATE_AI_MODEL,
  TEMPLATE_AI_REFERENCE_ATTACHMENT_ACCEPT,
  type TemplateAiReferenceAttachment,
  templateAiDifficultyLabels,
  templateAiDifficultyOptions,
  templateAiReferenceAttachmentSchema,
  templateAiToneLabels,
  templateAiToneOptions,
  templateAiTopicOptions,
  resolveTemplateAiTopicText,
} from "./templateAi";

export const TRAINING_PAGE_AI_DRAFT_SESSION_KEY = "phishsense.training-page.ai-draft";
export const DEFAULT_TRAINING_PAGE_AI_MODEL = DEFAULT_TEMPLATE_AI_MODEL;
export { TEMPLATE_AI_REFERENCE_ATTACHMENT_ACCEPT };
export type { TemplateAiReferenceAttachment };

export const trainingPageAiRequestSchema = z
  .object({
    topic: z.enum(templateAiTopicOptions),
    customTopic: z
      .string()
      .trim()
      .max(60, "직접 입력하는 주제는 60자 이하로 입력해 주세요.")
      .default(""),
    tone: z.enum(templateAiToneOptions),
    difficulty: z.enum(templateAiDifficultyOptions),
    prompt: z
      .string()
      .trim()
      .max(800, "추가 요청사항은 800자 이하로 입력해 주세요.")
      .default(""),
    generateCount: z.number().int().min(1).max(4).default(4),
    preservedCandidates: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
        }),
      )
      .max(3)
      .default([]),
    referenceAttachment: templateAiReferenceAttachmentSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.topic === "other" && value.customTopic.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customTopic"],
        message: "기타를 선택한 경우 주제를 직접 입력해 주세요.",
      });
    }
  });

export type TrainingPageAiRequest = z.infer<typeof trainingPageAiRequestSchema>;

export const trainingPageAiCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().min(1),
});

export type TrainingPageAiCandidate = z.infer<typeof trainingPageAiCandidateSchema>;

export const trainingPageAiGenerateResponseSchema = z.object({
  candidates: z.array(trainingPageAiCandidateSchema).min(1).max(4),
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

export type TrainingPageAiGenerateResponse = z.infer<typeof trainingPageAiGenerateResponseSchema>;

export type TrainingPageAiDraft = TrainingPageAiCandidate & {
  source: "ai";
  generatedAt: string;
};

export const buildTrainingPageAiTopicText = (request: TrainingPageAiRequest) =>
  resolveTemplateAiTopicText(request);

export const trainingPageAiDifficultyLabels = templateAiDifficultyLabels;
export const trainingPageAiToneLabels = templateAiToneLabels;
export const trainingPageAiTopicOptionsForUi = templateAiTopicOptions;
export const trainingPageAiToneOptionsForUi = templateAiToneOptions;
export const trainingPageAiDifficultyOptionsForUi = templateAiDifficultyOptions;
