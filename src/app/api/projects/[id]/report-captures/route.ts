import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { storage } from "@/server/storage";
import {
  buildReportCaptureFileKey,
  ensureDirectoryForFile,
  resolveStoragePath,
} from "@/server/services/reportStorage";
import type { InsertProject } from "@shared/schema";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

const CAPTURE_FIELDS: Array<{
  formKey: string;
  projectKey: keyof Pick<
    InsertProject,
    | "reportCaptureInboxFileKey"
    | "reportCaptureEmailFileKey"
    | "reportCaptureMaliciousFileKey"
    | "reportCaptureTrainingFileKey"
  >;
  label: string;
}> = [
  {
    formKey: "capture_inbox",
    projectKey: "reportCaptureInboxFileKey",
    label: "메일 수신함",
  },
  {
    formKey: "capture_email_body",
    projectKey: "reportCaptureEmailFileKey",
    label: "메일 본문",
  },
  {
    formKey: "capture_malicious_page",
    projectKey: "reportCaptureMaliciousFileKey",
    label: "악성 페이지",
  },
  {
    formKey: "capture_training_page",
    projectKey: "reportCaptureTrainingFileKey",
    label: "훈련 안내 페이지",
  },
];

const resolveExtension = (mime: string) => (mime === "image/png" ? "png" : "jpg");

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: "프로젝트 ID가 없습니다." }, { status: 400 });
    }

    const project = await storage.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const formData = await request.formData();
    const updates: Partial<InsertProject> = {};
    const uploaded: string[] = [];

    for (const field of CAPTURE_FIELDS) {
      const file = formData.get(field.formKey);
      if (!(file instanceof File)) {
        continue;
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `${field.label} 이미지는 PNG 또는 JPG 형식만 허용됩니다.` },
          { status: 400 },
        );
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `${field.label} 이미지는 5MB 이하만 업로드할 수 있습니다.` },
          { status: 400 },
        );
      }

      const extension = resolveExtension(file.type);
      const fileKey = buildReportCaptureFileKey(id, field.formKey, extension);
      const outputPath = resolveStoragePath(fileKey);
      await ensureDirectoryForFile(outputPath);
      await fs.writeFile(outputPath, Buffer.from(await file.arrayBuffer()));
      updates[field.projectKey] = fileKey as InsertProject[keyof InsertProject];
      uploaded.push(field.label);
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: "업로드할 캡처 이미지가 없습니다." },
        { status: 400 },
      );
    }

    const updated = await storage.updateProject(id, updates);
    return NextResponse.json({ project: updated, uploaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "캡처 업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
