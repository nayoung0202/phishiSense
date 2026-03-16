import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createReportTemplateForTenant,
  getActiveReportTemplateInTenant,
  getReportTemplatesForTenant,
} from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";
import {
  buildTemplateFileKey,
  ensureDirectoryForFile,
  resolveStoragePath,
} from "@/server/services/reportStorage";

export const runtime = "nodejs";

const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const templates = await getReportTemplatesForTenant(tenantId);
    return NextResponse.json({ templates });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch report templates");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const nameRaw = formData.get("name");
    const versionRaw = formData.get("version");
    const activateRaw = formData.get("activate");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "업로드할 템플릿 파일이 필요합니다." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "DOCX 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    if (file.size > MAX_TEMPLATE_SIZE) {
      return NextResponse.json({ error: "템플릿 파일은 10MB 이하만 허용됩니다." }, { status: 400 });
    }

    const version =
      typeof versionRaw === "string" && versionRaw.trim().length > 0
        ? versionRaw.trim()
        : "v1";
    const name =
      typeof nameRaw === "string" && nameRaw.trim().length > 0
        ? nameRaw.trim()
        : path.parse(file.name).name || "보고서 템플릿";

    const existingActive = await getActiveReportTemplateInTenant(tenantId);
    const activate =
      typeof activateRaw === "string"
        ? activateRaw === "true"
        : !existingActive;

    const templateId = randomUUID();
    const fileKey = buildTemplateFileKey(tenantId, templateId, version);
    const outputPath = resolveStoragePath(fileKey);
    await ensureDirectoryForFile(outputPath);
    await fs.writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

    const template = await createReportTemplateForTenant(
      tenantId,
      {
        name,
        version,
        fileKey,
      },
      { activate, id: templateId },
    );

    return NextResponse.json({ template });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "템플릿 업로드에 실패했습니다.");
  }
}
