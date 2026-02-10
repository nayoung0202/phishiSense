import { NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { buildTrainingLinkUrl, injectTrainingLink } from "@/server/lib/trainingLink";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const buildHtmlResponse = (message: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>훈련 시뮬레이션</title></head><body><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const normalized = token?.trim();
    if (!normalized) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const projectTarget = await storage.getProjectTargetByTrackingToken(normalized);
    if (!projectTarget) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }
    const project = await storage.getProject(projectTarget.projectId);
    if (!project || !project.templateId || !project.trainingPageId) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const [template, trainingPage] = await Promise.all([
      storage.getTemplate(project.templateId),
      storage.getTrainingPage(project.trainingPageId),
    ]);
    if (!template || !trainingPage) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const baseHtml = template.maliciousPageContent?.trim() || template.body || "";
    const trainingUrl = buildTrainingLinkUrl(normalized);
    const renderedHtml = injectTrainingLink(baseHtml, trainingUrl, {
      replaceSingleAnchor: false,
      replaceFirstAnchor: true,
      replaceFirstButton: true,
      appendType: "button",
    });

    if (projectTarget) {
      const now = new Date();
      const openedAt = projectTarget.openedAt ?? now;
      const clickedAt = projectTarget.clickedAt ?? now;
      const shouldIncrementOpen = !projectTarget.openedAt;
      const shouldIncrementClick = !projectTarget.clickedAt;
      const nextStatus = projectTarget.status === "submitted" ? "submitted" : "clicked";
      await storage.updateProjectTarget(projectTarget.id, {
        openedAt: shouldIncrementOpen ? openedAt : projectTarget.openedAt,
        clickedAt: shouldIncrementClick ? clickedAt : projectTarget.clickedAt,
        status: nextStatus,
      });
      if ((shouldIncrementOpen || shouldIncrementClick) && projectTarget.status !== "test") {
        await storage.updateProject(project.id, {
          openCount: (project.openCount ?? 0) + (shouldIncrementOpen ? 1 : 0),
          clickCount: (project.clickCount ?? 0) + (shouldIncrementClick ? 1 : 0),
        });
      }
    }

    const response = new NextResponse(renderedHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
    response.cookies.set("ps_flow_token", normalized, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
  }
}
