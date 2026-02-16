import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { buildSubmitUrl } from "@/server/lib/trainingLink";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: http: https:; font-src data: http: https:; base-uri 'none'; form-action 'self'; frame-ancestors 'none';",
};

const buildHtmlResponse = (message: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>제출 처리</title></head><body><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...securityHeaders,
      },
    },
  );

export async function POST(request: NextRequest, { params }: RouteContext) {
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

    await request.formData().catch(() => undefined);

    if (!projectTarget.submittedAt) {
      const now = new Date();
      const openedAt = projectTarget.openedAt ?? now;
      const clickedAt = projectTarget.clickedAt ?? now;
      const submittedAt = now;
      const shouldIncrementOpen = !projectTarget.openedAt;
      const shouldIncrementClick = !projectTarget.clickedAt;

      await storage.updateProjectTarget(projectTarget.id, {
        openedAt: shouldIncrementOpen ? openedAt : projectTarget.openedAt,
        clickedAt: shouldIncrementClick ? clickedAt : projectTarget.clickedAt,
        submittedAt,
        status: "submitted",
      });

      if (projectTarget.status !== "test") {
        const project = await storage.getProject(projectTarget.projectId);
        if (project) {
          await storage.updateProject(project.id, {
            openCount: (project.openCount ?? 0) + (shouldIncrementOpen ? 1 : 0),
            clickCount: (project.clickCount ?? 0) + (shouldIncrementClick ? 1 : 0),
            submitCount: (project.submitCount ?? 0) + 1,
          });
        }
      }
    }

    const response = NextResponse.redirect(buildSubmitUrl(normalized), 302);
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
