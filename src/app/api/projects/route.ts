import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import {
  projectCreateSchema,
  quarterNumbers,
  statusParamMap,
  normalizeProjectDate,
  normalizeStringArray,
  validateProjectPayload,
} from "@/server/services/projectsShared";
import { enqueueSendJobForProject } from "@/server/services/sendJobs";
import { validateTemplateForSend } from "@/server/services/templateSendValidation";
import type { InsertProject } from "@shared/schema";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryYear = searchParams.get("year");
    const parsedYear =
      queryYear && !Number.isNaN(Number(queryYear)) ? Number(queryYear) : undefined;

    const rawQuarter = searchParams.get("quarter");
    const parsedQuarter =
      rawQuarter && !Number.isNaN(Number(rawQuarter)) ? Number(rawQuarter) : undefined;

    const rawStatus = (searchParams.get("status") ?? "").toLowerCase();
    const statusFilter = statusParamMap[rawStatus] ?? undefined;

    const searchTerm = (searchParams.get("q") ?? "").trim().toLowerCase();

    const projects = await storage.getProjects();
    const filtered = projects.filter((project) => {
      const fiscalYear =
        project.fiscalYear ?? normalizeProjectDate(project.startDate).getFullYear();
      if (parsedYear && fiscalYear !== parsedYear) {
        return false;
      }

      const fiscalQuarter =
        project.fiscalQuarter ??
        Math.floor(normalizeProjectDate(project.startDate).getMonth() / 3) + 1;
      if (
        parsedQuarter &&
        quarterNumbers.includes(parsedQuarter as (typeof quarterNumbers)[number]) &&
        fiscalQuarter !== parsedQuarter
      ) {
        return false;
      }

      if (statusFilter && project.status !== statusFilter) {
        return false;
      }

      if (searchTerm.length > 0) {
        const haystack = [project.name, project.department ?? "", project.description ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const validated = projectCreateSchema.parse(payload);
    const { targetIds, ...projectPayload } = validated;
    const issues = validateProjectPayload(projectPayload as InsertProject);
    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: "validation_failed",
          issues,
        },
        { status: 422 },
      );
    }

    const { departmentTags, notificationEmails, ...projectRest } = projectPayload;
    const sanitized: InsertProject = {
      ...projectRest,
      departmentTags: normalizeStringArray(departmentTags),
      notificationEmails: normalizeStringArray(notificationEmails),
    };

    if (sanitized.status === "진행중") {
      if (!sanitized.templateId) {
        return NextResponse.json(
          {
            error: "send_validation_failed",
            issues: [
              {
                code: "template_missing",
                scope: "project",
                message: "프로젝트에 템플릿이 연결되어 있지 않습니다.",
              },
            ],
          },
          { status: 422 },
        );
      }
      const [template, trainingPage] = await Promise.all([
        storage.getTemplate(sanitized.templateId),
        sanitized.trainingPageId
          ? storage.getTrainingPage(sanitized.trainingPageId)
          : Promise.resolve(undefined),
      ]);
      if (!template) {
        return NextResponse.json(
          {
            error: "send_validation_failed",
            issues: [
              {
                code: "template_missing",
                scope: "project",
                message: "템플릿을 찾을 수 없습니다.",
              },
            ],
          },
          { status: 422 },
        );
      }
      const validation = validateTemplateForSend(template, trainingPage);
      if (!validation.ok) {
        return NextResponse.json(
          {
            error: "send_validation_failed",
            issues: validation.issues,
          },
          { status: 422 },
        );
      }
    }

    const project = await storage.createProject(sanitized);
    const uniqueTargetIds = Array.from(
      new Set((targetIds ?? []).map((id) => id.trim()).filter(Boolean)),
    );
    if (uniqueTargetIds.length > 0) {
      await Promise.all(
        uniqueTargetIds.map((targetId) =>
          storage.createProjectTarget({
            projectId: project.id,
            targetId,
            status: "sent",
          }),
        ),
      );
    }

    if (project.status === "진행중") {
      await enqueueSendJobForProject(project.id);
    }
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "validation_error",
          issues: error.issues.map((issue) => ({
            field: Array.isArray(issue.path) ? issue.path.join(".") : "",
            code: issue.code,
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Failed to create project" }, { status: 400 });
  }
}
