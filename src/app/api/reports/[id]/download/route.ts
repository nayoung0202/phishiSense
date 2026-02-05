import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { format } from "date-fns";
import { storage } from "@/server/storage";
import { fileExists, resolveStoragePath } from "@/server/services/reportStorage";

export const runtime = "nodejs";

const COMPANY_NAME_ENV = "REPORT_COMPANY_NAME";

const sanitizeFilename = (value: string) =>
  value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").trim();

const toAsciiFilename = (value: string) =>
  sanitizeFilename(value)
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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
  const companyName = (process.env[COMPANY_NAME_ENV] ?? "").trim();
  const project = await storage.getProject(instance.projectId);
  const projectName = project?.name ?? "project";
  const date = instance.completedAt ? new Date(instance.completedAt) : new Date();
  const formatted = format(date, "yyyyMMdd");
  const rawCompany = companyName || "company";
  const rawProject = projectName || "project";
  const rawFilename = `${rawCompany}_${rawProject}_보고서_${formatted}.docx`;
  const asciiFilename = toAsciiFilename(
    `${rawCompany}_${rawProject}_report_${formatted}.docx`,
  ) || `report-${id}.docx`;
  const encodedFilename = encodeURIComponent(rawFilename);
  const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": contentDisposition,
    },
  });
}
