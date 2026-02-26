import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { storage } from "@/server/storage";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "설정 ID가 필요합니다." }, { status: 400 });
    }

    const existing = await storage.getReportSetting(id);
    if (!existing) {
      return NextResponse.json({ error: "보고서 설정을 찾을 수 없습니다." }, { status: 404 });
    }

    const formData = await request.formData();
    const name = normalizeText(formData.get("name"));
    const companyName = normalizeText(formData.get("companyName"));
    const approverName = normalizeText(formData.get("approverName"));
    const isDefaultEntry = formData.get("isDefault");
    const logo = formData.get("logo");

    if (!name || !companyName || !approverName) {
      return NextResponse.json(
        { error: "설정명, 회사명, 승인자명은 필수입니다." },
        { status: 400 },
      );
    }

    let companyLogoFileKey = existing.companyLogoFileKey;
    if (logo instanceof File) {
      if (!ALLOWED_MIME_TYPES.has(logo.type)) {
        return NextResponse.json(
          { error: "로고는 PNG/JPEG 형식만 업로드할 수 있습니다." },
          { status: 400 },
        );
      }
      if (logo.size > MAX_LOGO_SIZE) {
        return NextResponse.json(
          { error: "로고 파일은 5MB 이하여야 합니다." },
          { status: 400 },
        );
      }
      const ext = resolveLogoExtension(logo);
      if (!ext) {
        return NextResponse.json({ error: "지원하지 않는 로고 형식입니다." }, { status: 400 });
      }
      companyLogoFileKey = buildReportSettingLogoFileKey(id, ext);
      const logoPath = resolveStoragePath(companyLogoFileKey);
      await ensureDirectoryForFile(logoPath);
      await fs.writeFile(logoPath, Buffer.from(await logo.arrayBuffer()));
    }

    const updated = await storage.updateReportSetting(
      id,
      {
        name,
        companyName,
        approverName,
        approverTitle: existing.approverTitle ?? "",
        companyLogoFileKey,
      },
      isDefaultEntry === null ? undefined : { makeDefault: toBoolean(isDefaultEntry) },
    );

    if (!updated) {
      return NextResponse.json({ error: "보고서 설정을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ item: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보고서 설정 수정에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
