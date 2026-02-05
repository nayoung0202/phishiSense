import { NextResponse } from "next/server";
import { z } from "zod";
import { generateProjectReport } from "@/server/services/reportGenerator";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().min(1, "프로젝트 ID가 필요합니다."),
  templateId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await generateProjectReport(parsed.data.projectId, {
      templateId: parsed.data.templateId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "보고서 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
