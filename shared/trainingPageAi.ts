import { z } from "zod";
import {
  DEFAULT_TEMPLATE_AI_MODEL,
  TEMPLATE_AI_REFERENCE_ATTACHMENT_ACCEPT,
  type TemplateAiReferenceAttachment,
  templateAiReferenceAttachmentSchema,
  templateAiTopicOptions,
  templateAiTopicLabels,
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

export const trainingPageAiTopicOptionsForUi = templateAiTopicOptions;

const trainingPageAiBaseGuidance = [
  "이 페이지는 피싱 모의훈련 또는 보안 인식 학습 안내 화면임을 명확하게 설명합니다.",
  "실제 로그인, 결제, 개인정보 제출이 필요하지 않다는 점을 분명하게 안내합니다.",
  "사용자가 다음부터 바로 실천할 수 있는 확인 요령을 2~3개 핵심 항목으로 정리합니다.",
] as const;

const trainingPageAiTopicGuidanceMap: Record<(typeof templateAiTopicOptions)[number], string[]> = {
  shipping: [
    "배송이나 결제 확인이 필요하더라도 메일이나 문자 안의 링크를 누르지 말고 공식 쇼핑몰 또는 택배사 앱/사이트에 직접 접속해 확인하라고 안내합니다.",
    "송장 조회, 주소 수정, 결제 재시도 전에는 발신자와 도메인을 다시 확인하라고 안내합니다.",
  ],
  "account-security": [
    "계정 재설정이나 보안 알림을 받았더라도 메일 링크 대신 공식 사이트 또는 공식 앱에 직접 접속해 확인하라고 반드시 안내합니다.",
    "비밀번호, OTP, 추가 인증 정보를 입력하기 전 주소창의 도메인을 다시 확인하라고 안내합니다.",
  ],
  "payroll-benefits": [
    "급여, 복지, 환급, 세금 관련 요청은 메일 링크가 아니라 사내 포털이나 공식 기관 사이트에 직접 접속해 확인하라고 안내합니다.",
    "주민등록번호, 계좌번호, 인증번호 같은 민감정보는 출처가 확인되기 전 입력하지 말라고 안내합니다.",
  ],
  "hr-announcement": [
    "인사 공지나 사내 안내는 메일 본문 링크보다 사내 인트라넷이나 공식 협업 도구에서 다시 확인하라고 안내합니다.",
    "첨부파일 실행 전 발신자와 공지 출처를 다시 확인하라고 안내합니다.",
  ],
  approval: [
    "전자결재 요청은 메일 링크가 아니라 그룹웨어나 결재 시스템에 직접 접속해 확인하라고 안내합니다.",
    "긴급 결재 문구가 있더라도 요청자와 결재 문서 정보를 별도로 재확인하라고 안내합니다.",
  ],
  "it-maintenance": [
    "IT 점검, 비밀번호 만료, 시스템 유지보수 안내는 메일 링크 대신 공식 포털이나 IT 지원 채널을 통해 직접 확인하라고 안내합니다.",
    "설치 파일 실행이나 추가 로그인 전에 공지 출처와 접속 주소를 재확인하라고 안내합니다.",
  ],
  other: [
    "사용자가 메일이나 메시지의 링크를 바로 누르지 말고 공식 사이트, 공식 앱, 사내 포털 등 신뢰 가능한 경로로 직접 접속해 확인하라고 안내합니다.",
    "민감정보 입력이나 파일 실행 전에는 발신자, 도메인, 요청 맥락을 다시 확인하라고 안내합니다.",
  ],
};

export const buildTrainingPageAiMandatoryGuidance = (request: TrainingPageAiRequest) => {
  const topicLabel =
    request.topic === "other" ? request.customTopic.trim() : templateAiTopicLabels[request.topic];
  const guidance = trainingPageAiTopicGuidanceMap[request.topic] ?? trainingPageAiTopicGuidanceMap.other;

  return {
    topicLabel,
    lines: [...trainingPageAiBaseGuidance, ...guidance],
  };
};
