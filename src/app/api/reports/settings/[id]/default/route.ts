import { NextResponse } from "next/server";
import { storage } from "@/server/storage";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "설정 ID가 없습니다." }, { status: 400 });
  }
  const updated = await storage.setDefaultReportSetting(id);
  if (!updated) {
    return NextResponse.json({ error: "보고서 설정을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}
