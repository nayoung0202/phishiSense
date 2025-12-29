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

    const project = await storage.getProjectByTrainingLinkToken(normalized);
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
