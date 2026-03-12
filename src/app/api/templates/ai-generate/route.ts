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
        { error: "Invalid AI template generation request", issues: error.errors },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "template_ai_generate_failed";
    const status = message === "gemini_api_key_missing" ? 503 : 500;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
