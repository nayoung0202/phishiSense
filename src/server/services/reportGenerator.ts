import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import { storage } from "@/server/storage";
import type { Project, ReportTemplate } from "@shared/schema";
import {
  buildReportFileKey,
  buildTemplateFileKey,
  ensureDirectoryForFile,
  fileExists,
  resolveStoragePath,
} from "./reportStorage";

const PYTHON_BIN = process.env.REPORT_PYTHON_BIN ?? "python3";
const PYTHON_SCRIPT = path.join(process.cwd(), "scripts", "report", "generate_report.py");
const DEFAULT_TEMPLATE_PATH =
  process.env.REPORT_DEFAULT_TEMPLATE_PATH ??
  path.join(process.cwd(), "attached_assets", "default_report_template.docx");

const formatDate = (value?: Date | string | null) => {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd");
};

const buildReportData = (project: Project) => {
  return {
    project_name: project.name ?? "",
    department: project.department ?? "",
    description: project.description ?? "",
    start_date: formatDate(project.startDate),
    end_date: formatDate(project.endDate),
    status: project.status ?? "",
    target_count: project.targetCount ?? 0,
    open_count: project.openCount ?? 0,
    click_count: project.clickCount ?? 0,
    submit_count: project.submitCount ?? 0,
    fiscal_year: project.fiscalYear ?? "",
    fiscal_quarter: project.fiscalQuarter ?? "",
  };
};

const runPythonRenderer = async (payload: object) => {
  if (!(await fileExists(PYTHON_SCRIPT))) {
    throw new Error("보고서 렌더러 스크립트를 찾을 수 없습니다.");
  }

  return new Promise<void>((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [PYTHON_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || "보고서 생성에 실패했습니다."));
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
};

const ensureDefaultTemplate = async (): Promise<ReportTemplate | undefined> => {
  const defaultExists = await fileExists(DEFAULT_TEMPLATE_PATH);
  if (!defaultExists) return undefined;

  const templateId = randomUUID();
  const version = "v1";
  const fileKey = buildTemplateFileKey(templateId, version);
  const destinationPath = resolveStoragePath(fileKey);

  await ensureDirectoryForFile(destinationPath);
  await fs.copyFile(DEFAULT_TEMPLATE_PATH, destinationPath);

  return storage.createReportTemplate(
    {
      name: "기본 보고서 템플릿",
      version,
      fileKey,
    },
    { activate: true, id: templateId },
  );
};

const resolveTemplate = async (templateId?: string | null) => {
  if (templateId) {
    const template = await storage.getReportTemplate(templateId);
    if (!template) {
      throw new Error("요청한 보고서 템플릿을 찾을 수 없습니다.");
    }
    return template;
  }

  const active = await storage.getActiveReportTemplate();
  if (active) return active;

  const defaultTemplate = await ensureDefaultTemplate();
  if (defaultTemplate) return defaultTemplate;

  throw new Error("활성화된 보고서 템플릿이 없습니다.");
};

export async function generateProjectReport(
  projectId: string,
  options?: { templateId?: string | null },
) {
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new Error("프로젝트 정보를 찾을 수 없습니다.");
  }

  const template = await resolveTemplate(options?.templateId ?? null);
  const templatePath = resolveStoragePath(template.fileKey);
  if (!(await fileExists(templatePath))) {
    throw new Error("보고서 템플릿 파일이 존재하지 않습니다.");
  }

  const reportInstance = await storage.createReportInstance({
    projectId: project.id,
    templateId: template.id,
    status: "pending",
    fileKey: null,
    errorMessage: null,
  });

  const reportFileKey = buildReportFileKey(reportInstance.id);
  const outputPath = resolveStoragePath(reportFileKey);
  await ensureDirectoryForFile(outputPath);

  try {
    await runPythonRenderer({
      template_path: templatePath,
      output_path: outputPath,
      data: buildReportData(project),
    });

    await storage.updateReportInstance(reportInstance.id, {
      status: "completed",
      fileKey: reportFileKey,
      completedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보고서 생성에 실패했습니다.";
    await storage.updateReportInstance(reportInstance.id, {
      status: "failed",
      errorMessage: message,
      completedAt: new Date(),
    });
    throw new Error(message);
  }

  return {
    instanceId: reportInstance.id,
    downloadUrl: `/api/reports/${reportInstance.id}/download`,
    fileKey: reportFileKey,
  };
}
