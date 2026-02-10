import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { buildPhishingLinkUrl } from "@/server/lib/trainingLink";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const buildHtmlResponse = (message: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>훈련 안내</title></head><body><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { token } = await params;
    const normalized = token?.trim();
    if (!normalized) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const flowToken = request.cookies.get("ps_flow_token")?.value ?? "";
    if (flowToken !== normalized) {
      return NextResponse.redirect(buildPhishingLinkUrl(normalized), 302);
    }

    const projectTarget = await storage.getProjectTargetByTrackingToken(normalized);
    if (!projectTarget) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }
    const project = await storage.getProject(projectTarget.projectId);
    if (!project || !project.trainingPageId) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const trainingPage = await storage.getTrainingPage(project.trainingPageId);
    if (!trainingPage) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    if (trainingPage.status === "inactive") {
      return buildHtmlResponse("훈련 안내 페이지가 비활성 상태입니다.", 404);
    }

    if (projectTarget) {
      const now = new Date();
      const openedAt = projectTarget.openedAt ?? now;
      const clickedAt = projectTarget.clickedAt ?? now;
      const submittedAt = projectTarget.submittedAt ?? now;
      const shouldIncrementOpen = !projectTarget.openedAt;
      const shouldIncrementClick = !projectTarget.clickedAt;
      const shouldIncrementSubmit = !projectTarget.submittedAt;

      await storage.updateProjectTarget(projectTarget.id, {
        openedAt: shouldIncrementOpen ? openedAt : projectTarget.openedAt,
        clickedAt: shouldIncrementClick ? clickedAt : projectTarget.clickedAt,
        submittedAt: shouldIncrementSubmit ? submittedAt : projectTarget.submittedAt,
        status: "submitted",
      });

      if (
        (shouldIncrementOpen || shouldIncrementClick || shouldIncrementSubmit) &&
        projectTarget.status !== "test"
      ) {
        await storage.updateProject(project.id, {
          openCount: (project.openCount ?? 0) + (shouldIncrementOpen ? 1 : 0),
          clickCount: (project.clickCount ?? 0) + (shouldIncrementClick ? 1 : 0),
          submitCount: (project.submitCount ?? 0) + (shouldIncrementSubmit ? 1 : 0),
        });
      }
    }

    const response = new NextResponse(trainingPage.content, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
    response.cookies.set("ps_flow_token", "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
  }
}
