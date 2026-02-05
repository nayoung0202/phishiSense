import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { storage } from "@/server/storage";
import { fileExists, resolveStoragePath } from "@/server/services/reportStorage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ error: "보고서 ID가 없습니다." }, { status: 400 });
  }

  const instance = await storage.getReportInstance(id);
  if (!instance || instance.status !== "completed" || !instance.fileKey) {
    return NextResponse.json({ error: "보고서 파일이 준비되지 않았습니다." }, { status: 404 });
  }

  const filePath = resolveStoragePath(instance.fileKey);
  if (!(await fileExists(filePath))) {
    return NextResponse.json({ error: "보고서 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const buffer = await fs.readFile(filePath);
  const filename = `report-${id}.docx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
