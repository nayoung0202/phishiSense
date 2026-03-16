import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import {
  createReportSettingForTenant,
  getDefaultReportSettingInTenant,
  listTenantReportSettings,
} from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";
import {
  buildReportSettingLogoFileKey,
  ensureDirectoryForFile,
  resolveStoragePath,
} from "@/server/services/reportStorage";

export const runtime = "nodejs";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

const toBoolean = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return false;
  return value.toLowerCase() === "true";
};

const normalizeText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const resolveLogoExtension = (file: File) => {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  return "";
};

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10);
    const result = await listTenantReportSettings(tenantId, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch report settings");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const formData = await request.formData();
    const logo = formData.get("logo");
    const name = normalizeText(formData.get("name"));
    const companyName = normalizeText(formData.get("companyName"));
    const approverName = normalizeText(formData.get("approverName"));
    const isDefault = toBoolean(formData.get("isDefault"));

    if (!(logo instanceof File)) {
      return NextResponse.json({ error: "회사 로고 파일이 필요합니다." }, { status: 400 });
    }
    if (!name || !companyName || !approverName) {
      return NextResponse.json(
        { error: "설정명, 회사명, 승인자명은 필수입니다." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME_TYPES.has(logo.type)) {
      return NextResponse.json({ error: "로고는 PNG/JPEG 형식만 업로드할 수 있습니다." }, { status: 400 });
    }
    if (logo.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: "로고 파일은 5MB 이하여야 합니다." }, { status: 400 });
    }

    const ext = resolveLogoExtension(logo);
    if (!ext) {
      return NextResponse.json({ error: "지원하지 않는 로고 형식입니다." }, { status: 400 });
    }

    const id = randomUUID();
    const logoFileKey = buildReportSettingLogoFileKey(tenantId, id, ext);
    const logoPath = resolveStoragePath(logoFileKey);
    await ensureDirectoryForFile(logoPath);
    await fs.writeFile(logoPath, Buffer.from(await logo.arrayBuffer()));

    const existingDefault = await getDefaultReportSettingInTenant(tenantId);
    const setting = await createReportSettingForTenant(
      tenantId,
      {
        name,
        companyName,
        companyLogoFileKey: logoFileKey,
        approverName,
        approverTitle: "",
        isDefault,
      },
      {
        id,
        makeDefault: isDefault || !existingDefault,
      },
    );

    return NextResponse.json({ item: setting });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "보고서 설정 저장에 실패했습니다.");
  }
}
