import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  templateAiGenerateResponseSchema,
  templateAiRequestSchema,
} from "@shared/templateAi";
import {
  generateTemplateAiCandidates,
  TemplateAiServiceError,
} from "@/server/services/templateAi";

export async function POST(request: Request) {
  try {
    const payload = templateAiRequestSchema.parse(await request.json());
    const result = await generateTemplateAiCandidates(payload);
    return NextResponse.json(templateAiGenerateResponseSchema.parse(result));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "AI 템플릿 생성 요청이 올바르지 않습니다.", issues: error.errors },
        { status: 400 },
      );
    }

    if (error instanceof TemplateAiServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "template_ai_generate_failed";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
