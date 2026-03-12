import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  templateAiGenerateResponseSchema,
  templateAiRequestSchema,
} from "@shared/templateAi";
import { generateTemplateAiCandidates } from "@/server/services/templateAi";

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

    const message = error instanceof Error ? error.message : "template_ai_generate_failed";
    const status = message === "gemini_api_key_missing" ? 503 : 500;
    const errorMessage =
      message === "gemini_api_key_missing"
        ? "서버에 Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 추가한 뒤 서버를 다시 시작하세요."
        : message;

    return NextResponse.json(
      { error: errorMessage },
      { status },
    );
  }
}
