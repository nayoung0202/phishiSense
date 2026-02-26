import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10);
  const result = await storage.listReportSettings(page, pageSize);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const logo = formData.get("logo");
    const name = normalizeText(formData.get("name"));
    const companyName = normalizeText(formData.get("companyName"));
    const approverName = normalizeText(formData.get("approverName"));
    const isDefault = toBoolean(formData.get("isDefault"));

    if (!(logo instanceof File)) {
      return NextResponse.json({ error: "?뚯궗 濡쒓퀬 ?뚯씪???꾩슂?⑸땲??" }, { status: 400 });
    }
    if (!name || !companyName || !approverName) {
      return NextResponse.json(
        { error: "설정명, 회사명, 승인자명은 필수입니다." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME_TYPES.has(logo.type)) {
      return NextResponse.json({ error: "濡쒓퀬??PNG/JPEG留??낅줈?쒗븷 ???덉뒿?덈떎." }, { status: 400 });
    }
    if (logo.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: "濡쒓퀬 ?뚯씪? 5MB ?댄븯?ъ빞 ?⑸땲??" }, { status: 400 });
    }

    const ext = resolveLogoExtension(logo);
    if (!ext) {
      return NextResponse.json({ error: "吏?먰븯吏 ?딅뒗 濡쒓퀬 ?뺤떇?낅땲??" }, { status: 400 });
    }

    const id = randomUUID();
    const logoFileKey = buildReportSettingLogoFileKey(id, ext);
    const logoPath = resolveStoragePath(logoFileKey);
    await ensureDirectoryForFile(logoPath);
    await fs.writeFile(logoPath, Buffer.from(await logo.arrayBuffer()));

    const existingDefault = await storage.getDefaultReportSetting();
    const setting = await storage.createReportSetting(
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
    const message = error instanceof Error ? error.message : "蹂닿퀬???ㅼ젙 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


