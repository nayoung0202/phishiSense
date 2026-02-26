import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_STORAGE_ROOT = path.join(process.cwd(), "storage");

export const REPORT_STORAGE_ROOT =
  process.env.REPORT_STORAGE_ROOT ?? DEFAULT_STORAGE_ROOT;

export function buildTemplateFileKey(templateId: string, version: string) {
  return path.posix.join(
    "reports",
    "templates",
    templateId,
    version,
    "template.docx",
  );
}

export function buildReportFileKey(instanceId: string) {
  return path.posix.join("reports", "generated", `${instanceId}.docx`);
}

export function buildReportCaptureFileKey(
  projectId: string,
  captureKey: string,
  extension: string,
) {
  const normalizedExt = extension.replace(/^\./, "");
  return path.posix.join(
    "reports",
    "captures",
    projectId,
    `${captureKey}.${normalizedExt}`,
  );
}

export function buildReportSettingLogoFileKey(
  settingId: string,
  extension: string,
) {
  const normalizedExt = extension.replace(/^\./, "");
  return path.posix.join(
    "reports",
    "settings",
    settingId,
    `logo.${normalizedExt}`,
  );
}

export function resolveStoragePath(fileKey: string) {
  const normalizedKey = fileKey.replace(/^\/+/, "");
  const fullPath = path.join(REPORT_STORAGE_ROOT, normalizedKey);
  const rootPath = path.resolve(REPORT_STORAGE_ROOT);
  const resolvedPath = path.resolve(fullPath);
  if (!resolvedPath.startsWith(rootPath)) {
    throw new Error("허용되지 않은 저장 경로입니다.");
  }
  return resolvedPath;
}

export async function ensureDirectoryForFile(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
