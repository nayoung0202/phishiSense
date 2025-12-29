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

    const project = await storage.getProjectByTrainingLinkToken(normalized);
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
